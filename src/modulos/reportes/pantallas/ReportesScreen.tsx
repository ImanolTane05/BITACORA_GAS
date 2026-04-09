import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { supabase } from '../../../lib/supabase';
import { AuthService } from '../../autenticacion/servicios/auth';
import { router } from 'expo-router';

// ── tipos ────────────────────────────────────────────────
interface Vehiculo { id: string; marca: string; modelo: string; placas: string; unidad_responsable: string; capacidad_tanque: number | null; cilindraje: number | null; numero_serie: string | null; numero_motor: string | null; }
interface BitacoraRow { id: string; fecha: string; km_inicial: number; km_final: number | null; destinos: string[]; tiene_suministro: boolean; suministro_importe: number | null; suministro_litros: number | null; usuario_adicional: string | null; estado: string; perfiles?: { nombre: string; apellido_paterno: string; } | null; }

const MES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Simple CSS gauge (avoids image encoding complexity)
const GAUGE_HTML = `<span style='font-family:monospace;font-size:6pt;color:#c00;'>E--|--F</span>`;

// ── generador HTML del reporte ────────────────────────────
function generarHTML(
  vehiculo: Vehiculo,
  mes: number, anio: number,
  filas: BitacoraRow[],
  tankImageBase64: string
): string {
  const padDate = (d: string) => { const [y,m,day] = d.split('-'); return `${day}/${m}/${y.slice(2)}`; };

  const totalLitros = filas.reduce((s, r) => s + (r.tiene_suministro && r.suministro_litros ? r.suministro_litros : 0), 0);
  const totalImporte = filas.reduce((s, r) => s + (r.tiene_suministro && r.suministro_importe ? r.suministro_importe : 0), 0);

  const tankImg = `<img src="data:image/jpeg;base64,${tankImageBase64}" style="width:38px;height:auto;display:block;margin:0 auto;" />`;

  const filasHTML = filas.map(r => `
    <tr>
      <td>${padDate(r.fecha)}</td>
      <td>${r.km_inicial}</td>
      <td>${r.km_final ?? ''}</td>
      <td>${tankImg}</td>
      <td>${r.tiene_suministro && r.suministro_litros ? r.suministro_litros.toFixed(3) + ' L' : ''}</td>
      <td>${tankImg}</td>
      <td></td>
      <td>${r.tiene_suministro && r.suministro_importe ? '$ ' + r.suministro_importe.toFixed(2) : ''}</td>
      <td>${(r.destinos ?? []).join(', ')}</td>
      <td>${r.usuario_adicional ?? ''}</td>
      <td></td>
    </tr>`).join('');

  // Filler rows to keep a consistent height
  const fillerCount = Math.max(0, 15 - filas.length);
  const fillerHTML = Array(fillerCount).fill('<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('');

  return `<!DOCTYPE html><html><head>
  <meta charset="UTF-8"/>
  <style>
    @page { size: landscape; margin: 15mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 7.5pt; padding: 0; color: #000; }
    
    .main-box { border: 1.5px solid #000; padding: 10px 15px; margin-bottom: 12px; text-align: center; }
    .main-box h1 { font-size: 11pt; margin-bottom: 4px; text-transform: uppercase; font-weight: bold; }
    
    .sub-info { font-size: 9pt; margin-bottom: 15px; }
    .sub-info div { margin-bottom: 10px; }
    .label-underline { border-bottom: 1.5px solid #000; display: inline-block; min-width: 500px; text-align: left; padding-left: 10px; }

    .header-grid { display: flex; justify-content: space-between; margin-bottom: 15px; }
    .header-left { width: 58%; }
    .header-right { width: 38%; }
    
    .info-row { display: flex; border: 1.5px solid #000; margin-bottom: -1.5px; }
    .info-cell { border-right: 1.5px solid #000; padding: 4px 8px; font-size: 8pt; flex: 1; display: flex; align-items: center; }
    .info-cell:last-child { border-right: none; }
    .info-cell strong { margin-right: 5px; font-size: 8pt; text-transform: uppercase; }

    table { width: 100%; border-collapse: collapse; margin-top: 5px; table-layout: fixed; }
    th, td { border: 1.5px solid #000; padding: 2px 2px; text-align: center; vertical-align: middle; font-size: 7pt; word-wrap: break-word; overflow: hidden; height: 28px; }
    th { background: #fff; font-weight: bold; font-size: 7.2pt; height: 32px; }
    .total-row td { font-weight: bold; height: 28px; }

    .footer-rendimiento { margin-top: 10px; font-size: 8pt; font-weight: normal; }
    .footer-rendimiento div { margin-bottom: 2px; }
    
    .signatures { display: flex; justify-content: space-between; margin-top: 35px; padding: 0 40px; text-align: center; }
    .sig-box { width: 45%; }
    .sig-line { border-top: 1.5px solid #000; padding-top: 6px; font-size: 8pt; font-weight: bold; margin-bottom: 3px; }
    .sig-name { font-size: 8.5pt; text-transform: uppercase; }
  </style>
  </head><body>
    <div class="main-box">
      <h1>Honorable Tribunal Superior de Justicia del Estado de Tlaxcala</h1>
      <h1>Bitácora de Combustible</h1>
    </div>

    <div class="sub-info">
      <div><strong>UNIDAD RESPONSABLE:</strong> <span class="label-underline">${vehiculo.unidad_responsable}</span></div>
      <div style="font-weight: bold; margin-top: 12px; margin-bottom: 5px;">CONTROL DE CONSUMO DE COMBUSTIBLE DE VEHÍCULOS</div>
    </div>

    <div class="header-grid">
      <div class="header-left">
        <div class="info-row">
          <div class="info-cell" style="flex: 1.2;"><strong>MARCA:</strong> ${vehiculo.marca}</div>
          <div class="info-cell" style="flex: 1.2;"><strong>MODELO:</strong> ${vehiculo.modelo}</div>
          <div class="info-cell"><strong>PLACAS:</strong> ${vehiculo.placas}</div>
        </div>
        <div class="info-row">
          <div class="info-cell"><strong>CAP. TANQUE:</strong> ${vehiculo.capacidad_tanque ?? '—'} LITROS</div>
          <div class="info-cell"><strong>CILINDRAJE:</strong> ${vehiculo.cilindraje ?? '—'}</div>
          <div class="info-cell"><strong>MES Y AÑO:</strong> ${String(mes).padStart(2,'0')}/${anio}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="info-row" style="height: 31px;">
          <div class="info-cell"><strong>NUMERO DE SERIE:</strong> ${vehiculo.numero_serie ?? '—'}</div>
        </div>
        <div class="info-row" style="height: 31px;">
          <div class="info-cell"><strong>NUMERO DE MOTOR:</strong> ${vehiculo.numero_motor ?? '—'}</div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th rowspan="2" style="width: 55px;">DIA</th>
          <th colspan="2" style="width: 110px;">KILOMETRAJE</th>
          <th colspan="4" style="width: 250px;">COMBUSTIBLE (EN LITROS)</th>
          <th rowspan="2" style="width: 75px;">IMPORTE $</th>
          <th rowspan="2" style="width: 170px;">RECORRIDO O LUGAR DE COMISIÓN</th>
          <th rowspan="2" style="width: 120px;">NOMBRE</th>
          <th rowspan="2" style="width: 100px;">FIRMA</th>
        </tr>
        <tr>
          <th>INICIAL</th><th>FINAL</th>
          <th style="font-size: 6.5pt;">TANQUE INICIAL</th><th>SUMINISTRO</th><th style="font-size: 6.5pt;">TANQUE FINAL</th><th style="font-size: 6.5pt;">DIFERENCIA</th>
        </tr>
      </thead>
      <tbody>
        ${filas.map(r => {
          const userName = r.perfiles ? `${r.perfiles.nombre} ${r.perfiles.apellido_paterno}` : (r.usuario_adicional || '');
          return `
          <tr>
            <td>${padDate(r.fecha)}</td>
            <td>${r.km_inicial}</td>
            <td>${r.km_final ?? ''}</td>
            <td>${tankImg}</td>
            <td>${r.tiene_suministro && r.suministro_litros ? r.suministro_litros.toFixed(3) + ' L' : ''}</td>
            <td>${tankImg}</td>
            <td></td>
            <td>${r.tiene_suministro && r.suministro_importe ? '$ ' + r.suministro_importe.toFixed(2) : ''}</td>
            <td>${(r.destinos ?? []).join(', ')}</td>
            <td>${userName}</td>
            <td></td>
          </tr>`;
        }).join('')}
        ${Array(Math.max(0, 12 - filas.length)).fill('<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')}
        <tr class="total-row">
          <td colspan="4">TOTAL</td>
          <td>${totalLitros > 0 ? totalLitros.toFixed(3) + ' L' : '0 L'}</td>
          <td></td><td></td>
          <td>$ ${totalImporte.toFixed(2)}</td>
          <td colspan="3"></td>
        </tr>
      </tbody>
    </table>

    <div class="footer-rendimiento">
      <div>RENDIMIENTO= TOTAL DE KMS RECORRIDOS/TOTAL DE LITROS SUMINISTRADOS</div>
      <div>RENDIMIENTO MENSUAL= __________ KMS POR LITRO</div>
    </div>

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line">NOMBRE Y FIRMA DEL RESGUARDANTE</div>
        <div class="sig-name">LCDO. RUBEN AVILES ROMANO</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">NOMBRE, FIRMA Y SELLO DEL TITULAR ADMINISTRATIVO</div>
      </div>
    </div>
  </body></html>`;
}

// ── mini bar chart ────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const BAR_MAX_H = 100;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_MAX_H + 24, paddingHorizontal: 4 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 8, color: '#aaa', marginBottom: 2 }}>
            {d.value > 0 ? d.value : ''}
          </Text>
          <View style={{
            width: '100%', borderRadius: 6,
            height: Math.max(4, (d.value / max) * BAR_MAX_H),
            backgroundColor: i === data.findIndex(x => x.value === max) ? '#5b1728' : '#e8c4cb',
          }} />
          <Text style={{ fontSize: 7, color: '#888', marginTop: 3 }} numberOfLines={1}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── screen ────────────────────────────────────────────────
export default function ReportesScreen() {
  const [currentUser, setCurrentUser] = useState<{ id: string; nombre: string; rol: string; area: string } | null>(null);
  const [logoutMenuVisible, setLogoutMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selector período
  const now = new Date();
  const [selectedMes, setSelectedMes] = useState(now.getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState(now.getFullYear());
  const [mesPickerVisible, setMesPickerVisible] = useState(false);

  // Vehículos disponibles + selección
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null);
  const [vehiculoPickerVisible, setVehiculoPickerVisible] = useState(false);

  // Datos para gráfica actividad
  const [actividadData, setActividadData] = useState<{ label: string; value: number }[]>([]);
  const [vehiculoMayorActividad, setVehiculoMayorActividad] = useState<{ placas: string; marca: string; modelo: string; km: number } | null>(null);

  // Historial de reportes generados (en memoria)
  const [historial, setHistorial] = useState<{ nombre: string; uri: string; fecha: string }[]>([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('perfiles').select('id, nombre, rol, area').eq('id', user.id).single();
      if (data) {
        setCurrentUser({ id: data.id, nombre: data.nombre, rol: data.rol, area: data.area });
        // Cargar vehículos según rol
        const q = data.rol === 'admin'
          ? supabase.from('vehiculos').select('*')
          : supabase.from('vehiculos').select('*').eq('unidad_responsable', data.area);
        const { data: veh } = await q;
        setVehiculos((veh ?? []) as Vehiculo[]);
        if (veh && veh.length === 1) setVehiculoSeleccionado(veh[0] as Vehiculo);

        await loadActividad(data.rol === 'admin' ? null : data.area);
      }
    }
    setLoading(false);
  };

  const loadActividad = async (area: string | null) => {
    // Obtener bitácoras del mes actual y calcular km por vehículo
    const primerDia = `${selectedAnio}-${String(selectedMes).padStart(2,'0')}-01`;
    const ultimo = new Date(selectedAnio, selectedMes, 0).getDate();
    const ultimoDia = `${selectedAnio}-${String(selectedMes).padStart(2,'0')}-${String(ultimo).padStart(2,'0')}`;

    let query = supabase.from('bitacoras')
      .select('vehiculo_id, km_inicial, km_final, vehiculos(marca, modelo, placas, unidad_responsable)')
      .gte('fecha', primerDia).lte('fecha', ultimoDia);
    const { data: bits } = await query;
    if (!bits) return;

    // Agrupar por vehículo
    const mapaKm: Record<string, { placas: string; marca: string; modelo: string; total: number }> = {};
    for (const b of bits as any[]) {
      const veh = b.vehiculos;
      if (!veh) continue;
      if (area && veh.unidad_responsable !== area) continue;
      const km = b.km_final != null ? b.km_final - b.km_inicial : 0;
      if (!mapaKm[b.vehiculo_id]) mapaKm[b.vehiculo_id] = { placas: veh.placas, marca: veh.marca, modelo: veh.modelo, total: 0 };
      mapaKm[b.vehiculo_id].total += km;
    }

    const lista = Object.values(mapaKm).sort((a, b) => b.total - a.total).slice(0, 6);
    setActividadData(lista.map(v => ({ label: v.placas, value: Math.round(v.total) })));
    if (lista.length > 0) {
      const top = lista[0];
      setVehiculoMayorActividad({ placas: top.placas, marca: top.marca, modelo: top.modelo, km: Math.round(top.total) });
    }
  };

  const generarPDF = async () => {
    if (!vehiculoSeleccionado) { Alert.alert('Requerido', 'Selecciona un vehículo.'); return; }

    setGenerating(true);

    // Fetch bitácoras del período
    const primerDia = `${selectedAnio}-${String(selectedMes).padStart(2,'0')}-01`;
    const ultimo = new Date(selectedAnio, selectedMes, 0).getDate();
    const ultimoDia = `${selectedAnio}-${String(selectedMes).padStart(2,'0')}-${String(ultimo).padStart(2,'0')}`;

    const { data: bits, error } = await supabase.from('bitacoras')
      .select('*, perfiles(nombre, apellido_paterno)')
      .eq('vehiculo_id', vehiculoSeleccionado.id)
      .gte('fecha', primerDia).lte('fecha', ultimoDia)
      .order('fecha', { ascending: true });

    if (error) { Alert.alert('Error', error.message); setGenerating(false); return; }
    if (!bits || bits.length === 0) {
      Alert.alert('Sin datos', 'No hay registros de bitácora para este vehículo en el período seleccionado.');
      setGenerating(false); return;
    }

    const asset = Asset.fromModule(require('../../../../assets/images/tanque.jpg'));
    if (!asset.downloaded) await asset.downloadAsync();
    
    // Read the asset as base64 for reliable display in PDF
    const tankImageBase64 = await FileSystem.readAsStringAsync(asset.localUri!, { encoding: 'base64' });

    const html = generarHTML(vehiculoSeleccionado, selectedMes, selectedAnio, bits as BitacoraRow[], tankImageBase64);

    try {
      // Explicit dimensions for landscape (8.5 x 11 inches in points)
      const { uri } = await Print.printToFileAsync({ 
        html, 
        base64: false,
        width: 792,
        height: 612 
      });
      
      const fileName = `Bitacora_${vehiculoSeleccionado.placas}_${String(selectedMes).padStart(2,'0')}_${selectedAnio}.pdf`;
      const destUri = (FileSystem.documentDirectory || '') + fileName;

      await FileSystem.moveAsync({
        from: uri,
        to: destUri
      });

      setHistorial(prev => [{ nombre: fileName, uri: destUri, fecha: new Date().toLocaleDateString('es-MX') }, ...prev]);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destUri, { mimeType: 'application/pdf', dialogTitle: 'Compartir reporte' });
      } else {
        Alert.alert('PDF generado', `Guardado: ${fileName}`);
      }
    } catch (e: any) {
      Alert.alert('Error al generar PDF', e.message ?? 'Error desconocido');
    }
    setGenerating(false);
  };

  const compartirHistorial = async (uri: string, nombre: string) => {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: nombre });
  };

  const años = [selectedAnio - 1, selectedAnio, selectedAnio + 1];

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><ActivityIndicator size="large" color="#5b1728" style={{ marginTop: 60 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>GESTIÓN DE REPORTES</Text>
            <Text style={styles.headerTitle}>Generación Mensual</Text>
          </View>
          <TouchableOpacity onPress={() => setLogoutMenuVisible(true)} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{currentUser?.nombre?.charAt(0).toUpperCase() ?? 'U'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Selector de período ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELECCIONAR PERÍODO</Text>
          <TouchableOpacity style={styles.periodSelector} onPress={() => setMesPickerVisible(true)}>
            <Text style={styles.periodText}>{MES_NOMBRES[selectedMes - 1]} {selectedAnio}</Text>
            <Feather name="chevron-down" size={18} color="#5b1728" />
          </TouchableOpacity>

          {/* Selector vehículo */}
          <Text style={[styles.sectionLabel, { marginTop: 12 }]}>VEHÍCULO</Text>
          <TouchableOpacity style={styles.periodSelector} onPress={() => setVehiculoPickerVisible(true)}>
            <Text style={vehiculoSeleccionado ? styles.periodText : styles.placeholderText} numberOfLines={1}>
              {vehiculoSeleccionado ? `${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo} · ${vehiculoSeleccionado.placas}` : 'Seleccionar vehículo...'}
            </Text>
            <Feather name="chevron-down" size={18} color="#5b1728" />
          </TouchableOpacity>

          {/* Acciones */}
          <TouchableOpacity style={styles.btnPrimary} onPress={generarPDF} disabled={generating}>
            {generating ? <ActivityIndicator color="#fff" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="file-chart" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Generar Reporte PDF</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Análisis de Actividad ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análisis de Actividad</Text>

          {vehiculoMayorActividad && (
            <View style={styles.topVehicleCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.topVehicleLabel}>VEHÍCULO CON MAYOR ACTIVIDAD</Text>
                <Text style={styles.topVehicleName}>{vehiculoMayorActividad.marca} {vehiculoMayorActividad.modelo}</Text>
                <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{vehiculoMayorActividad.placas}</Text>
              </View>
              <View style={styles.kmBadge}>
                <Text style={styles.kmBadgeText}>{vehiculoMayorActividad.km} KM</Text>
                <Text style={{ color: '#5b1728', fontSize: 9 }}>ESTE MES</Text>
              </View>
            </View>
          )}

          {actividadData.length > 0 ? (
            <View style={styles.chartBox}>
              <BarChart data={actividadData} />
            </View>
          ) : (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <MaterialCommunityIcons name="chart-bar" size={36} color="#ddd" />
              <Text style={{ color: '#bbb', marginTop: 8 }}>Sin actividad este mes</Text>
            </View>
          )}
        </View>

        {/* ── Historial de reportes generados ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial Reciente</Text>
          {historial.length === 0 ? (
            <Text style={{ color: '#bbb', textAlign: 'center', paddingVertical: 16 }}>Aún no has generado reportes</Text>
          ) : (
            historial.map((h, i) => (
              <View key={i} style={styles.historialItem}>
                <View style={styles.historialIcon}>
                  <MaterialCommunityIcons name="file-pdf-box" size={22} color="#c0392b" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.historialNombre} numberOfLines={1}>{h.nombre}</Text>
                  <View style={styles.pdfBadge}><Text style={styles.pdfBadgeText}>PDF</Text></View>
                </View>
                <Text style={{ color: '#bbb', fontSize: 11, marginRight: 8 }}>{h.fecha}</Text>
                <TouchableOpacity onPress={() => compartirHistorial(h.uri, h.nombre)}>
                  <Feather name="download" size={18} color="#5b1728" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Modal Mes/Año ── */}
      <Modal visible={mesPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Seleccionar Período</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {años.map(y => MES_NOMBRES.map((m, mi) => (
                <TouchableOpacity key={`${y}-${mi}`}
                  style={[styles.pickerRow, selectedMes === mi+1 && selectedAnio === y && styles.pickerRowActive]}
                  onPress={() => { setSelectedMes(mi + 1); setSelectedAnio(y); setMesPickerVisible(false); }}>
                  <Text style={[styles.pickerRowText, selectedMes === mi+1 && selectedAnio === y && { color: '#5b1728', fontWeight: 'bold' }]}>
                    {m} {y}
                  </Text>
                  {selectedMes === mi+1 && selectedAnio === y && <Feather name="check" size={16} color="#5b1728" />}
                </TouchableOpacity>
              )))}
            </ScrollView>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setMesPickerVisible(false)}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal Vehículo ── */}
      <Modal visible={vehiculoPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Seleccionar Vehículo</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {vehiculos.map(v => (
                <TouchableOpacity key={v.id}
                  style={[styles.pickerRow, vehiculoSeleccionado?.id === v.id && styles.pickerRowActive]}
                  onPress={() => { setVehiculoSeleccionado(v); setVehiculoPickerVisible(false); }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerRowText}>{v.marca} {v.modelo}</Text>
                    <Text style={{ color: '#888', fontSize: 11 }}>{v.placas} · {v.unidad_responsable}</Text>
                  </View>
                  {vehiculoSeleccionado?.id === v.id && <Feather name="check" size={16} color="#5b1728" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setVehiculoPickerVisible(false)}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Logout ── */}
      <Modal visible={logoutMenuVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.logoutOverlay} activeOpacity={1} onPress={() => setLogoutMenuVisible(false)}>
          <View style={styles.logoutMenu}>
            <View style={{ alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
              <View style={styles.avatarCircleLg}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{currentUser?.nombre?.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={{ fontWeight: 'bold', color: '#333', marginTop: 6 }}>{currentUser?.nombre}</Text>
              <Text style={{ color: '#999', fontSize: 11 }}>{(currentUser?.rol ?? '').toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={async () => { setLogoutMenuVisible(false); await AuthService.signOut(); router.replace('/'); }}>
              <Feather name="log-out" size={18} color="#c0392b" />
              <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { padding: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerSub: { fontSize: 10, fontWeight: 'bold', color: '#aaa', letterSpacing: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#222', marginTop: 2 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  section: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionLabel: { fontSize: 10, fontWeight: 'bold', color: '#aaa', letterSpacing: 0.5, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#222', marginBottom: 14 },

  periodSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7f7f7', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 12 },
  periodText: { fontSize: 15, fontWeight: '600', color: '#222' },
  placeholderText: { fontSize: 14, color: '#bbb' },

  btnPrimary: { backgroundColor: '#5b1728', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  topVehicleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdf0f3', borderRadius: 14, padding: 14, marginBottom: 14 },
  topVehicleLabel: { fontSize: 9, fontWeight: 'bold', color: '#aaa', letterSpacing: 0.5 },
  topVehicleName: { fontSize: 16, fontWeight: 'bold', color: '#5b1728', marginTop: 4 },
  kmBadge: { backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#f0dde2' },
  kmBadgeText: { fontSize: 13, fontWeight: 'bold', color: '#5b1728' },
  chartBox: { backgroundColor: '#fafafa', borderRadius: 14, padding: 12, marginTop: 4 },

  historialItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  historialIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff3f3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  historialNombre: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  pdfBadge: { backgroundColor: '#fde8e8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, alignSelf: 'flex-start' },
  pdfBadgeText: { color: '#c0392b', fontSize: 9, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalBox: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#5b1728', textAlign: 'center', marginBottom: 16 },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', paddingHorizontal: 4 },
  pickerRowActive: { backgroundColor: '#fdf0f3', borderRadius: 8, paddingHorizontal: 8 },
  pickerRowText: { fontSize: 14, color: '#333' },
  btnCancel: { marginTop: 14, padding: 14, backgroundColor: '#eee', borderRadius: 12, alignItems: 'center' },
  btnCancelText: { fontWeight: 'bold', color: '#666' },

  logoutOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: 20 },
  logoutMenu: { backgroundColor: '#fff', borderRadius: 20, padding: 18, width: 210, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 8 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, backgroundColor: '#fff0f0', borderRadius: 12 },
  logoutBtnText: { fontSize: 13, fontWeight: 'bold', color: '#c0392b', marginLeft: 8 },
  avatarCircleLg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center' },
});
