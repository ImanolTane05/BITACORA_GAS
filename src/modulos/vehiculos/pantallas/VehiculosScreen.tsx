import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Alert, ActivityIndicator
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { AuthService } from '../../autenticacion/servicios/auth';
import { VehiculosService, Vehiculo } from '../servicios/vehiculosService';

const AREAS_DISPONIBLES = [
  'Control de Bienes Muebles e Inmuebles',
  'Mantenimiento',
  'Almacén',
  'Recursos Materiales',
];

export default function VehiculosScreen() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [filteredVehiculos, setFilteredVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtros
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const [currentUser, setCurrentUser] = useState<{ nombre: string; rol: string; area: string } | null>(null);
  const [logoutMenuVisible, setLogoutMenuVisible] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Vista detalle (solo lectura)
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | null>(null);

  const emptyForm = {
    unidad_responsable: '',
    marca: '',
    modelo: '',
    placas: '',
    capacidad_tanque: '',
    cilindraje: '',
    numero_serie: '',
    numero_motor: '',
    fotografia: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadUserAndData(); }, []);

  const loadUserAndData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    let rolActual = 'usuario';
    let areaActual = '';

    if (user) {
      const { data } = await supabase.from('perfiles').select('nombre, rol, area').eq('id', user.id).single();
      if (data) {
        rolActual = data.rol;
        areaActual = data.area;
        setCurrentUser({ nombre: data.nombre, rol: data.rol, area: data.area });
      }
    }

    const { data: vehiculosData, error } = rolActual === 'admin'
      ? await VehiculosService.getVehiculos()
      : await VehiculosService.getVehiculosPorArea(areaActual);

    if (error) {
      Alert.alert('Error', 'No se pudieron cargar los vehículos: ' + error.message);
    } else if (vehiculosData) {
      setVehiculos(vehiculosData as Vehiculo[]);
    }
    setLoading(false);
  };

  // Busqueda + filtros en tiempo real
  useEffect(() => {
    let result = [...vehiculos];

    if (filterArea) {
      result = result.filter(v => v.unidad_responsable === filterArea);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(v =>
        v.marca.toLowerCase().includes(q) ||
        v.modelo.toLowerCase().includes(q) ||
        v.placas.toLowerCase().includes(q) ||
        (v.numero_serie && v.numero_serie.toLowerCase().includes(q)) ||
        (v.numero_motor && v.numero_motor.toLowerCase().includes(q)) ||
        v.unidad_responsable.toLowerCase().includes(q)
      );
    }

    setFilteredVehiculos(result);
  }, [searchQuery, vehiculos, filterArea]);

  const applyFilters = () => {
    setActiveFiltersCount(filterArea ? 1 : 0);
    setFilterModalVisible(false);
  };

  const clearFilters = () => {
    setFilterArea(null);
    setActiveFiltersCount(0);
    setFilterModalVisible(false);
  };

  const handleSave = async () => {
    if (!form.unidad_responsable || !form.marca || !form.modelo || !form.placas) {
      Alert.alert('Campos Obligatorios', 'Por favor llena la unidad responsable, marca, modelo y placas.');
      return;
    }

    const dataToSave = {
      unidad_responsable: form.unidad_responsable,
      marca: form.marca,
      modelo: form.modelo,
      placas: form.placas,
      capacidad_tanque: form.capacidad_tanque ? parseFloat(form.capacidad_tanque) : null,
      cilindraje: form.cilindraje ? parseFloat(form.cilindraje) : null,
      numero_serie: form.numero_serie || null,
      numero_motor: form.numero_motor || null,
      fotografia: form.fotografia || null,
    };

    setLoading(true);
    if (isEditing && editingId) {
      const { error } = await VehiculosService.updateVehiculo(editingId, dataToSave);
      if (error) Alert.alert('Error', error.message);
      else { Alert.alert('Éxito', 'Vehículo actualizado.'); setModalVisible(false); loadUserAndData(); }
    } else {
      const { error } = await VehiculosService.createVehiculo(dataToSave);
      if (error) Alert.alert('Error', error.message);
      else { Alert.alert('Éxito', 'Vehículo registrado.'); setModalVisible(false); loadUserAndData(); }
    }
    setLoading(false);
  };

  const handleOpenEdit = (vehiculo: Vehiculo) => {
    setForm({
      unidad_responsable: vehiculo.unidad_responsable,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      placas: vehiculo.placas,
      capacidad_tanque: vehiculo.capacidad_tanque?.toString() || '',
      cilindraje: vehiculo.cilindraje?.toString() || '',
      numero_serie: vehiculo.numero_serie || '',
      numero_motor: vehiculo.numero_motor || '',
      fotografia: vehiculo.fotografia || '',
    });
    setEditingId(vehiculo.id);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirmar', '¿Eliminar este vehículo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setLoading(true);
          const { error } = await VehiculosService.deleteVehiculo(id);
          if (error) Alert.alert('Error', error.message);
          else loadUserAndData();
        }
      }
    ]);
  };

  const isAdmin = currentUser?.rol === 'admin';

  const renderVehiculoCard = (item: Vehiculo) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => { setSelectedVehiculo(item); setViewModalVisible(true); }}
    >
      <View style={styles.cardInner}>
        {/* Icono */}
        <View style={styles.cardIconBox}>
          <MaterialCommunityIcons name="car" size={22} color="#5b1728" />
        </View>

        {/* Info - flex:1 para que no desborde */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.marca} {item.modelo}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.placas}{item.cilindraje ? ` · ${item.cilindraje} CC` : ''}
          </Text>
          {/* Área como chip */}
          <View style={styles.areaBadge}>
            <Feather name="map-pin" size={10} color="#666" style={{ marginRight: 4 }} />
            <Text style={styles.areaBadgeText} numberOfLines={1} ellipsizeMode="tail">
              {item.unidad_responsable}
            </Text>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.cardActions}>
          {isAdmin ? (
            <>
              <TouchableOpacity style={styles.actionIcon} onPress={(e) => { e.stopPropagation?.(); handleOpenEdit(item); }}>
                <Feather name="edit-2" size={17} color="#5b1728" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon} onPress={(e) => { e.stopPropagation?.(); handleDelete(item.id); }}>
                <Feather name="trash-2" size={17} color="#e74c3c" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.actionIcon}>
              <Feather name="chevron-right" size={17} color="#bbb" />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Vehículos</Text>
          <TouchableOpacity onPress={() => setLogoutMenuVisible(true)} activeOpacity={0.7} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {currentUser?.nombre ? currentUser.nombre.charAt(0).toUpperCase() : 'U'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Buscador + Filtro */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color="#888" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar marca, modelo, placas..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={16} color="#888" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Feather name="filter" size={16} color={activeFiltersCount > 0 ? '#fff' : '#5b1728'} />
            {activeFiltersCount > 0 && (
              <Text style={styles.filterBtnCount}>{activeFiltersCount}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tarjeta destacada */}
        {vehiculos.length > 0 && vehiculos[0] && (
          <View style={styles.highlightCard}>
            <View style={styles.highlightStatus}>
              <Text style={styles.highlightStatusText}>EN SERVICIO</Text>
            </View>
            <Text style={styles.highlightTitle} numberOfLines={1}>{vehiculos[0].marca} {vehiculos[0].modelo}</Text>
            <Text style={styles.highlightSubtitle}>Placas: {vehiculos[0].placas}</Text>
            <View style={styles.highlightFooter}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.highlightFooterLabel}>ÁREA</Text>
                <Text style={styles.highlightFooterValue} numberOfLines={1}>{vehiculos[0].unidad_responsable}</Text>
              </View>
              <View>
                <Text style={styles.highlightFooterLabel}>ÚLTIMA BITÁCORA</Text>
                <Text style={styles.highlightFooterValue}>Sin registro</Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsCard}>
          <MaterialCommunityIcons name="chart-bar" size={24} color="#ffc1cd" style={{ marginBottom: 4 }} />
          <Text style={styles.statsSubtitle}>FLOTA TOTAL</Text>
          <Text style={styles.statsNumber}>{vehiculos.length}</Text>
          <Text style={styles.statsLink}>Ver Reportes</Text>
        </View>

        {/* Listado */}
        <Text style={styles.sectionTitle}>LISTADO DE UNIDADES</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#5b1728" style={{ marginTop: 20 }} />
        ) : filteredVehiculos.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <MaterialCommunityIcons name="car-off" size={40} color="#ddd" />
            <Text style={{ color: '#aaa', marginTop: 10, fontSize: 14 }}>No se encontraron vehículos</Text>
          </View>
        ) : (
          filteredVehiculos.map(renderVehiculoCard)
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* FAB - Solo Admin */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => { setForm(emptyForm); setIsEditing(false); setEditingId(null); setModalVisible(true); }}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal Agregar / Editar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? 'Editar Vehículo' : 'Registrar Vehículo'}</Text>
            <ScrollView style={{ width: '100%' }} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Unidad Responsable *</Text>
              <View style={styles.areaPickerContainer}>
                {AREAS_DISPONIBLES.map(area => (
                  <TouchableOpacity
                    key={area}
                    style={[styles.areaOption, form.unidad_responsable === area && styles.areaOptionActive]}
                    onPress={() => setForm({ ...form, unidad_responsable: area })}
                  >
                    <Text style={[styles.areaOptionText, form.unidad_responsable === area && { color: '#fff' }]}>{area}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Marca *</Text>
              <TextInput style={styles.inputBox} placeholder="Ej. Chevrolet" placeholderTextColor="#bbb" value={form.marca} onChangeText={t => setForm({ ...form, marca: t })} />
              <Text style={styles.fieldLabel}>Modelo *</Text>
              <TextInput style={styles.inputBox} placeholder="Ej. S10 / 2023" placeholderTextColor="#bbb" value={form.modelo} onChangeText={t => setForm({ ...form, modelo: t })} />
              <Text style={styles.fieldLabel}>Placas *</Text>
              <TextInput style={styles.inputBox} placeholder="Ej. ABC-1234" placeholderTextColor="#bbb" autoCapitalize="characters" value={form.placas} onChangeText={t => setForm({ ...form, placas: t })} />
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Tanque (L)</Text>
                  <TextInput style={styles.inputBox} placeholder="Ej. 60" placeholderTextColor="#bbb" keyboardType="numeric" value={form.capacidad_tanque} onChangeText={t => setForm({ ...form, capacidad_tanque: t })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Cilindraje (CC)</Text>
                  <TextInput style={styles.inputBox} placeholder="Ej. 2500" placeholderTextColor="#bbb" keyboardType="numeric" value={form.cilindraje} onChangeText={t => setForm({ ...form, cilindraje: t })} />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Número de Serie</Text>
              <TextInput style={styles.inputBox} placeholder="VIN..." placeholderTextColor="#bbb" autoCapitalize="characters" value={form.numero_serie} onChangeText={t => setForm({ ...form, numero_serie: t })} />
              <Text style={styles.fieldLabel}>Número de Motor</Text>
              <TextInput style={styles.inputBox} placeholder="..." placeholderTextColor="#bbb" autoCapitalize="characters" value={form.numero_motor} onChangeText={t => setForm({ ...form, numero_motor: t })} />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Filtros */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrar Vehículos</Text>
            <ScrollView style={{ width: '100%' }}>
              <Text style={styles.fieldLabel}>Por Unidad Responsable (Área)</Text>
              <View style={styles.areaPickerContainer}>
                {AREAS_DISPONIBLES.map(area => (
                  <TouchableOpacity
                    key={area}
                    style={[styles.areaOption, filterArea === area && styles.areaOptionActive]}
                    onPress={() => setFilterArea(filterArea === area ? null : area)}
                  >
                    <Text style={[styles.areaOptionText, filterArea === area && { color: '#fff' }]}>{area}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={clearFilters}>
                <Text style={styles.btnCancelText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={applyFilters}>
                <Text style={styles.btnSaveText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal Ver Detalle Vehículo (Solo Lectura) ── */}
      <Modal visible={viewModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Detalle del Vehículo</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)} style={{ padding: 4 }}>
                <Feather name="x" size={22} color="#888" />
              </TouchableOpacity>
            </View>
            {selectedVehiculo && (
              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                {/* Ícono cabecera */}
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f4e8eb', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="car" size={36} color="#5b1728" />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginTop: 10 }}>
                    {selectedVehiculo.marca} {selectedVehiculo.modelo}
                  </Text>
                  <View style={{ backgroundColor: '#f4e8eb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 6 }}>
                    <Text style={{ color: '#5b1728', fontWeight: 'bold', fontSize: 13 }}>{selectedVehiculo.placas}</Text>
                  </View>
                </View>

                {[
                  { label: 'Placas', value: selectedVehiculo.placas },
                  { label: 'Unidad Responsable', value: selectedVehiculo.unidad_responsable },
                  { label: 'Capacidad del Tanque', value: selectedVehiculo.capacidad_tanque ? `${selectedVehiculo.capacidad_tanque} L` : '—' },
                  { label: 'Cilindraje', value: selectedVehiculo.cilindraje ? `${selectedVehiculo.cilindraje} CC` : '—' },
                  { label: 'Número de Serie', value: selectedVehiculo.numero_serie ?? '—' },
                  { label: 'Número de Motor', value: selectedVehiculo.numero_motor ?? '—' },
                ].map(row => (
                  <View key={row.label} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#aaa', letterSpacing: 0.5, marginBottom: 3 }}>{row.label.toUpperCase()}</Text>
                    <Text style={{ fontSize: 15, color: '#222', fontWeight: '500' }}>{row.value}</Text>
                  </View>
                ))}
                <View style={{ height: 10 }} />
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.btnCancel, { marginTop: 16 }]} onPress={() => setViewModalVisible(false)}>
              <Text style={styles.btnCancelText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Cerrar Sesión */}
      <Modal visible={logoutMenuVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.logoutOverlay} activeOpacity={1} onPress={() => setLogoutMenuVisible(false)}>
          <View style={styles.logoutMenu}>
            <View style={styles.logoutMenuHeader}>
              <View style={styles.avatarCircleLg}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                  {currentUser?.nombre ? currentUser.nombre.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <Text style={styles.logoutMenuTitle}>{currentUser?.nombre || 'Usuario'}</Text>
              <Text style={styles.logoutMenuSubtitle}>{(currentUser?.rol || 'usuario').toUpperCase()}</Text>
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
  scrollContent: { padding: 20 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#5b1728' },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  searchContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#e9ecef', borderRadius: 20, paddingHorizontal: 14, alignItems: 'center', height: 46, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  filterBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#f4e8eb', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e0c0cc', flexDirection: 'row' },
  filterBtnActive: { backgroundColor: '#5b1728' },
  filterBtnCount: { color: '#fff', fontWeight: 'bold', fontSize: 11, marginLeft: 2 },

  highlightCard: { backgroundColor: '#fff', borderRadius: 22, padding: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  highlightStatus: { backgroundColor: '#135c36', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10 },
  highlightStatusText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  highlightTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  highlightSubtitle: { fontSize: 12, color: '#666', marginTop: 2, marginBottom: 14 },
  highlightFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 14 },
  highlightFooterLabel: { fontSize: 9, color: '#888', fontWeight: 'bold', marginBottom: 2 },
  highlightFooterValue: { fontSize: 13, color: '#222', fontWeight: 'bold' },

  statsCard: { backgroundColor: '#5b1728', borderRadius: 22, padding: 22, alignItems: 'center', marginBottom: 26, shadowColor: '#5b1728', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 5 },
  statsSubtitle: { color: '#ffc1cd', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  statsNumber: { color: '#fff', fontSize: 44, fontWeight: 'bold', marginVertical: 4 },
  statsLink: { color: '#ffc1cd', fontSize: 12, textDecorationLine: 'underline' },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#888', letterSpacing: 1, marginBottom: 12 },

  card: { backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, paddingVertical: 14, paddingHorizontal: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardInner: { flexDirection: 'row', alignItems: 'center' },
  cardIconBox: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f4e8eb', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#222', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#666', marginBottom: 6 },
  areaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  areaBadgeText: { fontSize: 10, color: '#555', fontWeight: '600', flexShrink: 1 },
  cardActions: { flexDirection: 'row', flexShrink: 0, marginLeft: 8 },
  actionIcon: { padding: 7 },

  fab: { position: 'absolute', bottom: 100, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center', shadowColor: '#5b1728', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 7 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 22, maxHeight: '85%' },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#5b1728', marginBottom: 18, textAlign: 'center' },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 5, marginLeft: 2 },
  inputBox: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 13, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0', fontSize: 14, color: '#333' },

  areaPickerContainer: { flexDirection: 'column', marginBottom: 14 },
  areaOption: { backgroundColor: '#f0f0f0', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 11, marginBottom: 7, borderWidth: 1.5, borderColor: '#e0e0e0' },
  areaOptionActive: { backgroundColor: '#5b1728', borderColor: '#5b1728' },
  areaOptionText: { fontSize: 13, color: '#444', fontWeight: '600' },

  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btnCancel: { flex: 1, padding: 14, backgroundColor: '#eee', borderRadius: 12, marginRight: 10, alignItems: 'center' },
  btnCancelText: { fontWeight: 'bold', color: '#666' },
  btnSave: { flex: 1, padding: 14, backgroundColor: '#5b1728', borderRadius: 12, alignItems: 'center' },
  btnSaveText: { fontWeight: 'bold', color: '#fff' },

  logoutOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: 20 },
  logoutMenu: { backgroundColor: '#fff', borderRadius: 20, padding: 18, width: 210, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 8 },
  logoutMenuHeader: { alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatarCircleLg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoutMenuTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  logoutMenuSubtitle: { fontSize: 11, color: '#999', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, backgroundColor: '#fff0f0', borderRadius: 12 },
  logoutBtnText: { fontSize: 13, fontWeight: 'bold', color: '#c0392b', marginLeft: 8 },
});
