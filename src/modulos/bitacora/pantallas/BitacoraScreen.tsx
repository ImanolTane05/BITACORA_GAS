import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Alert, ActivityIndicator, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { AuthService } from '../../autenticacion/servicios/auth';
import { BitacoraService, Bitacora } from '../servicios/bitacoraService';

// ── helpers ──────────────────────────────────────────────
const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};
const today = () => new Date().toISOString().split('T')[0];

const DESTINOS_OPCIONES = [
  'Ciudad Judicial',
  'Juzgado de Sanchez Piedras (Apizaco)',
  'Palacio de Justicia',
  'Juzgado de xicotencatl (San Pablo del Monte)',
  'Juzgado de guridi y Alcocer (Tlaxcala)',
  'Segunda instancia  (Tlaxcala)',
  'Juzgado de Ocampo (Calpulapan)',
  'Juzgado de Juarez (Huamantla)',
  'Juzgado Tradicional (Apizaco)',
  'Juzgado de Zaragoza (Zacatelco)',
  'Juzgado de Morelos (Tlaxco)',
  'Archivo (Huamantla)',
  'Archivo (Tlaxcala)',
  'Juzgado Sistema Tradicional (Apizaco)',
  'Juzgado de Ejecución (Apizaco)',
  'Juzgado de la Mujer (Tlaxcala)',
  'Otro'
];

// Minimal vehicle type for the picker
interface VehiculoItem {
  id: string;
  marca: string;
  modelo: string;
  placas: string;
  unidad_responsable: string;
}

export default function BitacoraScreen() {
  // ── state ─────────────────────────────────────────────
  const [bitacoras, setBitacoras] = useState<Bitacora[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; nombre: string; rol: string; area: string } | null>(null);
  const [logoutMenuVisible, setLogoutMenuVisible] = useState(false);

  // Date filter
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [resultCount, setResultCount] = useState(0);

  // Form modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Vehicle picker state
  const [vehiculosArea, setVehiculosArea] = useState<VehiculoItem[]>([]);
  const [vehiculoPickerVisible, setVehiculoPickerVisible] = useState(false);

  // Form fields (simplified)
  const [vehiculoId, setVehiculoId] = useState('');
  const [vehiculoLabel, setVehiculoLabel] = useState('');
  const [fecha, setFecha] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [kmInicial, setKmInicial] = useState('');
  const [kmFinal, setKmFinal] = useState('');
  const [destinos, setDestinos] = useState<string[]>(['']);
  const [destinoPickerIndices, setDestinoPickerIndices] = useState<number[]>([]);
  const [tieneSuministro, setTieneSuministro] = useState(false);
  const [suministroImporte, setSuministroImporte] = useState('');
  const [suministroLitros, setSuministroLitros] = useState('');
  const [usuarioAdicional, setUsuarioAdicional] = useState('');

  // ── load ──────────────────────────────────────────────
  useEffect(() => { loadUserAndData(); }, []);

  const loadUserAndData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase.from('perfiles').select('id, nombre, rol, area').eq('id', user.id).single();
      if (data) {
        setCurrentUser({ id: data.id, nombre: data.nombre, rol: data.rol, area: data.area });

        // Fetch vehicles: admin sees all, others only their area
        let vQuery = supabase.from('vehiculos').select('id, marca, modelo, placas, unidad_responsable');
        if (data.rol !== 'admin') {
          vQuery = vQuery.eq('unidad_responsable', data.area);
        }
        const { data: vData } = await vQuery;

        setVehiculosArea((vData ?? []) as VehiculoItem[]);
        await fetchBitacoras(data.rol, data.area);
      }
    }
    setLoading(false);
  };

  const fetchBitacoras = async (rol?: string, area?: string, d?: string, h?: string) => {
    const r = rol ?? currentUser?.rol ?? 'usuario';
    const a = area ?? currentUser?.area ?? '';

    let data: Bitacora[] = [];
    let error: any = null;

    if (r === 'admin') {
      const res = await BitacoraService.getBitacoras(d, h);
      data = (res.data as Bitacora[]) ?? []; error = res.error;
    } else {
      const res = await BitacoraService.getBitacorasPorArea(a, d, h);
      data = (res.data as Bitacora[]) ?? []; error = res.error;
    }

    if (error) Alert.alert('Error', error.message);
    else { setBitacoras(data); setResultCount(data.length); }
  };

  const applyDateFilter = () => fetchBitacoras(undefined, undefined, desde || undefined, hasta || undefined);
  const clearFilter = () => { setDesde(''); setHasta(''); fetchBitacoras(); };

  // ── form helpers ──────────────────────────────────────
  const resetForm = () => {
    setVehiculoId(''); setVehiculoLabel('');
    setVehiculoPickerVisible(false);
    setFecha(today()); setShowDatePicker(false);
    setKmInicial(''); setKmFinal('');
    setDestinos(['']); setDestinoPickerIndices([]);
    setTieneSuministro(false); setSuministroImporte(''); setSuministroLitros('');
    setUsuarioAdicional('');
  };

  const openAdd = () => { resetForm(); setIsEditing(false); setEditingId(null); setModalVisible(true); };

  const openEdit = (b: Bitacora) => {
    const veh = b.vehiculos;
    setVehiculoId(b.vehiculo_id ?? '');
    setVehiculoLabel(veh ? `${veh.marca} ${veh.modelo} · ${veh.placas}` : '');
    setFecha(b.fecha);
    setKmInicial(b.km_inicial?.toString() ?? '');
    setKmFinal(b.km_final?.toString() ?? '');
    setDestinos(b.destinos?.length ? b.destinos : ['']);
    setTieneSuministro(b.tiene_suministro);
    setSuministroImporte(b.suministro_importe?.toString() ?? '');
    setSuministroLitros(b.suministro_litros?.toString() ?? '');
    setUsuarioAdicional(b.usuario_adicional ?? '');
    setEditingId(b.id); setIsEditing(true); setModalVisible(true);
  };

  const addDestino = () => { if (destinos.length < 5) setDestinos([...destinos, '']); };
  const removeDestino = (i: number) => setDestinos(destinos.filter((_, idx) => idx !== i));
  const updateDestino = (i: number, val: string) => {
    const d = [...destinos]; d[i] = val; setDestinos(d);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFecha(selectedDate.toISOString().split('T')[0]);
    }
  };

  const toggleDestinoPicker = (index: number) => {
    if (destinoPickerIndices.includes(index)) {
      setDestinoPickerIndices(destinoPickerIndices.filter(i => i !== index));
    } else {
      setDestinoPickerIndices([...destinoPickerIndices, index]);
    }
  };

  const handleSave = async () => {
    if (!vehiculoId) { Alert.alert('Requerido', 'Selecciona un vehículo.'); return; }
    if (!kmInicial) { Alert.alert('Requerido', 'Ingresa el Km Inicial.'); return; }
    const destinosFiltrados = destinos.filter(d => d.trim() !== '');
    if (destinosFiltrados.length === 0) { Alert.alert('Requerido', 'Agrega al menos un destino.'); return; }

    const payload: any = {
      vehiculo_id: vehiculoId,
      usuario_id: currentUser?.id,
      fecha,
      km_inicial: parseFloat(kmInicial),
      km_final: kmFinal ? parseFloat(kmFinal) : null,
      destinos: destinosFiltrados,
      tiene_suministro: tieneSuministro,
      suministro_importe: tieneSuministro && suministroImporte ? parseFloat(suministroImporte) : null,
      suministro_litros: tieneSuministro && suministroLitros ? parseFloat(suministroLitros) : null,
      suministro_folio: null,
      suministro_foto: null,
      usuario_adicional: usuarioAdicional || null,
      observaciones: null,
      estado: kmFinal ? 'finalizado' : 'en_ruta',
    };

    setLoading(true);
    if (isEditing && editingId) {
      const { error } = await BitacoraService.updateBitacora(editingId, payload);
      if (error) Alert.alert('Error', error.message);
      else { Alert.alert('Éxito', 'Registro actualizado.'); setModalVisible(false); loadUserAndData(); }
    } else {
      const { error } = await BitacoraService.createBitacora(payload);
      if (error) Alert.alert('Error', error.message);
      else { Alert.alert('Éxito', 'Registro guardado.'); setModalVisible(false); loadUserAndData(); }
    }
    setLoading(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirmar', '¿Eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
          const { error } = await BitacoraService.deleteBitacora(id);
          if (error) Alert.alert('Error', error.message); else loadUserAndData();
        }
      }
    ]);
  };

  const canEditDelete = currentUser?.rol === 'admin' || currentUser?.rol === 'encargado';

  // ── card ──────────────────────────────────────────────
  const renderCard = (item: Bitacora) => {
    const veh = item.vehiculos;
    const finalizado = item.estado === 'finalizado';
    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <MaterialCommunityIcons name="car" size={20} color="#5b1728" />
          </View>
          <View style={styles.cardTitles}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={styles.cardPlacas} numberOfLines={1}>{veh?.placas ?? '—'}</Text>
              <View style={[styles.estadoBadge, finalizado ? styles.estadoFinalizado : styles.estadoEnRuta]}>
                <Text style={styles.estadoBadgeText}>{finalizado ? 'FINALIZADO' : 'EN RUTA'}</Text>
              </View>
            </View>
            <Text style={styles.cardFecha}>{fmtDate(item.fecha)}</Text>
          </View>
          {canEditDelete && (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.actionIcon} onPress={() => openEdit(item)}><Feather name="edit-2" size={16} color="#5b1728" /></TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon} onPress={() => handleDelete(item.id)}><Feather name="trash-2" size={16} color="#e74c3c" /></TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.cardDetails}>
          <View>
            <Text style={styles.detailLabel}>KILOMETRAJE (INI/FIN)</Text>
            <Text style={styles.detailValue}>{item.km_inicial} / {item.km_final ?? '––'} km</Text>
          </View>
          {item.tiene_suministro && (
            <View>
              <Text style={styles.detailLabel}>SUMINISTRO</Text>
              <Text style={styles.detailValueImporte}>${item.suministro_importe?.toFixed(2) ?? '0.00'}</Text>
            </View>
          )}
        </View>

        {item.destinos?.length > 0 && (
          <View style={styles.recorridoBox}>
            <Text style={styles.detailLabel}>RECORRIDO</Text>
            <Text style={styles.recorridoText} numberOfLines={2}>{item.destinos.join(' → ')}</Text>
          </View>
        )}

        {item.usuario_adicional && (
          <View style={styles.recorridoBox}>
            <Text style={styles.detailLabel}>USUARIO ADICIONAL</Text>
            <Text style={styles.recorridoText}>{item.usuario_adicional}</Text>
          </View>
        )}
      </View>
    );
  };

  // ── render ────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Historial de Bitácora</Text>
          <TouchableOpacity onPress={() => setLogoutMenuVisible(true)} activeOpacity={0.7} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{currentUser?.nombre?.charAt(0).toUpperCase() ?? 'U'}</Text>
          </TouchableOpacity>
        </View>

        {/* Filtro Fechas */}
        <View style={styles.filterCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Feather name="filter" size={16} color="#5b1728" style={{ marginRight: 8 }} />
            <Text style={styles.filterCardTitle}>Filtrar por fecha</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>DESDE</Text>
              <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor="#bbb" value={desde} onChangeText={setDesde} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>HASTA</Text>
              <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor="#bbb" value={hasta} onChangeText={setHasta} keyboardType="numeric" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={[styles.filterActionBtn, { backgroundColor: '#5b1728' }]} onPress={applyDateFilter}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Aplicar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterActionBtn, { backgroundColor: '#eee' }]} onPress={clearFilter}>
              <Text style={{ color: '#555', fontWeight: 'bold', fontSize: 13 }}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Encabezado lista */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>REGISTROS DE SALIDAS</Text>
          <Text style={styles.countBadge}>{resultCount} {resultCount === 1 ? 'entrada' : 'entradas'} encontradas</Text>
        </View>

        {/* Lista */}
        {loading ? (
          <ActivityIndicator size="large" color="#5b1728" style={{ marginTop: 30 }} />
        ) : bitacoras.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <FontAwesome5 name="file-invoice" size={40} color="#ddd" />
            <Text style={{ color: '#aaa', marginTop: 10 }}>Sin registros de salidas</Text>
          </View>
        ) : (
          bitacoras.map(renderCard)
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* ── Modal Formulario ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? 'Editar Registro' : 'Nuevo Registro'}</Text>

            <ScrollView style={{ width: '100%' }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Vehículo — Inline Picker (No nested Modals to prevent freeze) */}
              <Text style={styles.fieldLabel}>VEHÍCULO *</Text>
              <TouchableOpacity
                style={styles.selectorBox}
                onPress={() => setVehiculoPickerVisible(!vehiculoPickerVisible)}
                activeOpacity={0.7}
              >
                <Text style={vehiculoId ? styles.selectorValue : styles.selectorPlaceholder} numberOfLines={1}>
                  {vehiculoLabel || 'Toca para seleccionar...'}
                </Text>
                <Feather name={vehiculoPickerVisible ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
              </TouchableOpacity>

              {vehiculoPickerVisible && (
                <View style={styles.inlinePicker}>
                  {vehiculosArea.length === 0 ? (
                    <View style={{ alignItems: 'center', padding: 16 }}>
                      <MaterialCommunityIcons name="car-off" size={30} color="#ddd" />
                      <Text style={{ color: '#aaa', marginTop: 6, fontSize: 12, textAlign: 'center' }}>
                        No hay vehículos en tu área.
                      </Text>
                    </View>
                  ) : (
                    vehiculosArea.map(v => {
                      const isSelected = vehiculoId === v.id;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                          activeOpacity={0.7}
                          onPress={() => {
                            setVehiculoId(v.id);
                            setVehiculoLabel(`${v.marca} ${v.modelo} · ${v.placas}`);
                            setVehiculoPickerVisible(false);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.pickerItemTitle, isSelected && { color: '#5b1728' }]}>
                              {v.marca} {v.modelo}
                            </Text>
                            <Text style={styles.pickerItemSub}>{v.placas} · {v.unidad_responsable}</Text>
                          </View>
                          {isSelected && <Feather name="check-circle" size={18} color="#5b1728" />}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              {/* Fecha */}
              <Text style={styles.fieldLabel}>FECHA</Text>
              <TouchableOpacity
                style={styles.selectorBox}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.selectorValue}>{fmtDate(fecha)}</Text>
                <Feather name="calendar" size={18} color="#888" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={new Date(fecha + 'T12:00:00')}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}

              {/* Kilometraje */}
              <Text style={styles.fieldLabel}>KM INICIAL *</Text>
              <TextInput style={styles.inputBox} placeholder="12450" placeholderTextColor="#bbb" value={kmInicial} onChangeText={setKmInicial} keyboardType="numeric" />

              <Text style={styles.fieldLabel}>KM FINAL (opcional)</Text>
              <TextInput style={styles.inputBox} placeholder="12580" placeholderTextColor="#bbb" value={kmFinal} onChangeText={setKmFinal} keyboardType="numeric" />

              {/* Destinos */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>RECORRIDO / DESTINOS *</Text>
                <View style={styles.destinosCounter}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{destinos.length}/5</Text>
                </View>
              </View>
              {destinos.map((d, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <View style={styles.destinoRow}>
                    <TouchableOpacity
                      style={[styles.selectorBox, { flex: 1, marginBottom: 0 }]}
                      onPress={() => toggleDestinoPicker(i)}
                    >
                      <Text style={d ? styles.selectorValue : styles.selectorPlaceholder} numberOfLines={1}>
                        {d || `Seleccionar destino ${i + 1}`}
                      </Text>
                      <Feather name="chevron-down" size={16} color="#888" />
                    </TouchableOpacity>
                    {destinos.length > 1 && (
                      <TouchableOpacity style={styles.removeDest} onPress={() => removeDestino(i)}>
                        <Feather name="x" size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {destinoPickerIndices.includes(i) && (
                    <View style={styles.inlinePicker}>
                      {DESTINOS_OPCIONES.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={styles.pickerItem}
                          onPress={() => {
                            updateDestino(i, opt);
                            toggleDestinoPicker(i);
                          }}
                        >
                          <Text style={[styles.pickerItemTitle, d === opt && { color: '#5b1728' }]}>{opt}</Text>
                          {d === opt && <Feather name="check" size={14} color="#5b1728" />}
                        </TouchableOpacity>
                      ))}
                      <TextInput
                        style={[styles.inputBox, { margin: 10, marginBottom: 10 }]}
                        placeholder="Escribir otro destino..."
                        placeholderTextColor="#bbb"
                        onEndEditing={(e) => {
                          if (e.nativeEvent.text) {
                            updateDestino(i, e.nativeEvent.text);
                            toggleDestinoPicker(i);
                          }
                        }}
                      />
                    </View>
                  )}
                </View>
              ))}
              {destinos.length < 5 && (
                <TouchableOpacity style={styles.addDestinoBtn} onPress={addDestino}>
                  <Feather name="plus" size={14} color="#5b1728" />
                  <Text style={{ color: '#5b1728', fontWeight: '600', fontSize: 13, marginLeft: 5 }}>Agregar destino</Text>
                </TouchableOpacity>
              )}

              {/* Suministro */}
              <View style={styles.suministroHeader}>
                <View>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>⛽  Suministro de Combustible</Text>
                  <Text style={{ color: '#f4c0c8', fontSize: 11, marginTop: 2 }}>¿REGISTRAR CARGA?</Text>
                </View>
                <Switch
                  value={tieneSuministro}
                  onValueChange={setTieneSuministro}
                  trackColor={{ true: '#fff', false: '#8b3a4a' }}
                  thumbColor={tieneSuministro ? '#5b1728' : '#ccc'}
                />
              </View>
              {tieneSuministro && (
                <View style={styles.suministroBody}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>IMPORTE ($)</Text>
                      <TextInput style={styles.inputBox} placeholder="0.00" placeholderTextColor="#bbb" value={suministroImporte} onChangeText={setSuministroImporte} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>LITROS</Text>
                      <TextInput style={styles.inputBox} placeholder="0.000" placeholderTextColor="#bbb" value={suministroLitros} onChangeText={setSuministroLitros} keyboardType="numeric" />
                    </View>
                  </View>
                </View>
              )}

              {/* Usuario adicional */}
              <Text style={styles.fieldLabel}>OTRO USUARIO (opcional)</Text>
              <TextInput style={styles.inputBox} placeholder="Nombre del responsable adicional / externo" placeholderTextColor="#bbb" value={usuarioAdicional} onChangeText={setUsuarioAdicional} />

            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setVehiculoPickerVisible(false); setModalVisible(false); }}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.btnSaveText}>Guardar</Text>
                    <Feather name="send" size={15} color="#fff" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>



      {/* ── Logout ── */}
      <Modal visible={logoutMenuVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.logoutOverlay} activeOpacity={1} onPress={() => setLogoutMenuVisible(false)}>
          <View style={styles.logoutMenu}>
            <View style={styles.logoutMenuHeader}>
              <View style={styles.avatarCircleLg}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{currentUser?.nombre?.charAt(0).toUpperCase() ?? 'U'}</Text>
              </View>
              <Text style={styles.logoutMenuTitle}>{currentUser?.nombre ?? 'Usuario'}</Text>
              <Text style={styles.logoutMenuSubtitle}>{(currentUser?.rol ?? 'usuario').toUpperCase()}</Text>
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

// ── styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scrollContent: { padding: 20 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#5b1728' },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  filterCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  filterCardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  dateInput: { backgroundColor: '#f4f4f4', borderRadius: 10, padding: 12, fontSize: 13, color: '#333', borderWidth: 1, borderColor: '#e0e0e0' },
  filterActionBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#888', letterSpacing: 1 },
  countBadge: { fontSize: 11, color: '#888', fontStyle: 'italic' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f4e8eb', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  cardTitles: { flex: 1, minWidth: 0 },
  cardPlacas: { fontSize: 15, fontWeight: 'bold', color: '#222' },
  cardFecha: { fontSize: 12, color: '#888', marginTop: 2 },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  estadoFinalizado: { backgroundColor: '#135c36' },
  estadoEnRuta: { backgroundColor: '#888' },
  estadoBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  actionIcon: { padding: 7 },
  cardDetails: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 12, marginBottom: 10 },
  detailLabel: { fontSize: 9, color: '#888', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 3 },
  detailValue: { fontSize: 13, fontWeight: 'bold', color: '#222' },
  detailValueImporte: { fontSize: 15, fontWeight: 'bold', color: '#5b1728' },
  recorridoBox: { borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 10, marginTop: 2 },
  recorridoText: { fontSize: 13, color: '#333', marginTop: 4 },

  fab: { position: 'absolute', bottom: 100, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center', shadowColor: '#5b1728', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 7 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 22, maxHeight: '90%' },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#5b1728', textAlign: 'center', marginBottom: 18 },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#888', marginBottom: 5, marginLeft: 2, letterSpacing: 0.5 },
  inputBox: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 13, marginBottom: 14, borderWidth: 1, borderColor: '#e5e5e5', fontSize: 14, color: '#333' },

  selectorBox: { backgroundColor: '#f8f8f8', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: '#e5e5e5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectorValue: { fontSize: 14, fontWeight: '600', color: '#222', flex: 1, marginRight: 6 },
  selectorPlaceholder: { fontSize: 14, color: '#bbb', flex: 1, marginRight: 6 },

  destinosCounter: { backgroundColor: '#5b1728', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: 5 },
  destinoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  removeDest: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center' },
  addDestinoBtn: { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1.5, borderColor: '#5b1728', borderRadius: 12, borderStyle: 'dashed', justifyContent: 'center', marginBottom: 16 },

  suministroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#5b1728', borderRadius: 16, padding: 16, marginBottom: 14 },
  suministroBody: { backgroundColor: '#fef9fa', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f0dde2' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnCancel: { flex: 1, padding: 14, backgroundColor: '#eee', borderRadius: 12, alignItems: 'center' },
  btnCancelText: { fontWeight: 'bold', color: '#666' },
  btnSave: { flex: 1, padding: 14, backgroundColor: '#5b1728', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSaveText: { fontWeight: 'bold', color: '#fff' },

  inlinePicker: { backgroundColor: '#fcfcfc', borderRadius: 12, paddingHorizontal: 4, marginBottom: 14, borderWidth: 1, borderColor: '#eee' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f4' },
  pickerItemActive: { backgroundColor: '#fdf0f3', borderRadius: 10 },
  pickerItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#222' },
  pickerItemSub: { fontSize: 11, color: '#888', marginTop: 1 },

  logoutOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: 20 },
  logoutMenu: { backgroundColor: '#fff', borderRadius: 20, padding: 18, width: 210, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 8 },
  logoutMenuHeader: { alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatarCircleLg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoutMenuTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  logoutMenuSubtitle: { fontSize: 11, color: '#999', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, backgroundColor: '#fff0f0', borderRadius: 12 },
  logoutBtnText: { fontSize: 13, fontWeight: 'bold', color: '#c0392b', marginLeft: 8 },
});
