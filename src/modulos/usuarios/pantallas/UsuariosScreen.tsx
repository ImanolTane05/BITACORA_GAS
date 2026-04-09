import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, Modal, Alert, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { UsuariosService, Perfil } from '../servicios/usuariosService';
import { AuthService } from '../../autenticacion/servicios/auth';
import { supabase } from '../../../lib/supabase';

const AREAS_DISPONIBLES = [
  'Control de Bienes Muebles e Inmuebles',
  'Mantenimiento',
  'Almacén',
  'Recursos Materiales',
];

export default function UsuariosScreen() {
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtros
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterRol, setFilterRol] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [logoutMenuVisible, setLogoutMenuVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<{nombre: string; rol: string} | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = {
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    cargo: '',
    area: '',
    rol: 'usuario' as 'admin' | 'encargado' | 'usuario',
  };
  const [form, setForm] = useState(emptyForm);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadUsuarios = async () => {
    setLoading(true);
    const { data, error } = await UsuariosService.getPerfiles();
    if (error) {
      Alert.alert('Error', 'No se pudieron cargar los usuarios: ' + error.message);
    } else if (data) {
      setUsuarios(data as Perfil[]);
      setFilteredUsuarios(data as Perfil[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadUsuarios(); }, []);

  // Cargar perfil del usuario logueado
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data } = await supabase.from('perfiles').select('nombre, apellido_paterno, rol').eq('id', user.id).single();
        if (data) {
          setCurrentUser({ nombre: data.nombre, rol: data.rol });
        } else {
          const meta = user.user_metadata;
          setCurrentUser({ nombre: meta?.nombre || 'Usuario', rol: meta?.rol || 'usuario' });
        }
      }
    };
    loadCurrentUser();
  }, []);

  // Áreas únicas para el filtro
  const areasUnicas = [...new Set(usuarios.map(u => u.area))];

  // Búsqueda + filtros en tiempo real
  useEffect(() => {
    let result = [...usuarios];

    // Filtro por rol
    if (filterRol) {
      result = result.filter(u => u.rol === filterRol);
    }
    // Filtro por área
    if (filterArea) {
      result = result.filter(u => u.area === filterArea);
    }
    // Búsqueda por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(u =>
        u.nombre.toLowerCase().includes(q) ||
        u.apellido_paterno.toLowerCase().includes(q) ||
        u.apellido_materno.toLowerCase().includes(q) ||
        u.area.toLowerCase().includes(q)
      );
    }

    setFilteredUsuarios(result);
  }, [searchQuery, usuarios, filterRol, filterArea]);

  const applyFilters = () => {
    let count = 0;
    if (filterRol) count++;
    if (filterArea) count++;
    setActiveFiltersCount(count);
    setFilterModalVisible(false);
  };

  const clearFilters = () => {
    setFilterRol(null);
    setFilterArea(null);
    setActiveFiltersCount(0);
    setFilterModalVisible(false);
  };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setIsEditing(false); };

  const handleOpenAdd = () => { resetForm(); setModalVisible(true); };

  const handleOpenEdit = (user: Perfil) => {
    setIsEditing(true);
    setEditingId(user.id);
    setForm({
      email: '',
      password: '',
      confirmPassword: '',
      nombre: user.nombre,
      apellido_paterno: user.apellido_paterno,
      apellido_materno: user.apellido_materno,
      cargo: user.cargo,
      area: user.area,
      rol: user.rol,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    if (id === currentUserId) {
      Alert.alert('No permitido', 'No puedes eliminar tu propia cuenta activa.');
      return;
    }
    Alert.alert('Eliminar', '¿Estás seguro de eliminar este usuario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          const { error } = await UsuariosService.deletePerfil(id);
          if (error) Alert.alert('Error', error.message);
          else loadUsuarios();
        }
      }
    ]);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.apellido_paterno || !form.cargo || !form.area) {
      Alert.alert('Campos obligatorios', 'Nombre, Apellido Paterno, Cargo y Área son requeridos.');
      return;
    }

    if (isEditing && editingId) {
      const { error } = await UsuariosService.updatePerfil(editingId, {
        nombre: form.nombre,
        apellido_paterno: form.apellido_paterno,
        apellido_materno: form.apellido_materno,
        cargo: form.cargo,
        area: form.area,
        rol: form.rol,
      });
      if (error) Alert.alert('Error al actualizar', error.message);
      else { Alert.alert('Éxito', 'Usuario actualizado.'); setModalVisible(false); loadUsuarios(); }
    } else {
      if (!form.email || !form.password) {
        Alert.alert('Campos obligatorios', 'El correo y la contraseña son necesarios.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        Alert.alert('Contraseñas no coinciden', 'La contraseña y la confirmación deben ser iguales.');
        return;
      }
      // Validar fortaleza: min 8 chars, una mayúscula, un número
      const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passRegex.test(form.password)) {
        Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número.');
        return;
      }
      const { error } = await AuthService.signUpConMetadatos(form.email, form.password, {
        nombre: form.nombre,
        apellido_paterno: form.apellido_paterno,
        apellido_materno: form.apellido_materno,
        cargo: form.cargo,
        area: form.area,
        rol: form.rol,
      });
      if (error) {
        const msg = typeof error.message === 'string' ? error.message.toLowerCase() : '';
        const statusStr = String(error.status || '') + String(error.message || '');
        
        if (msg.includes('rate limit') || msg.includes('email rate')) {
          Alert.alert(
            'Límite de correos',
            'Ve a Supabase → Authentication → Sign In / Providers → Email → Desactiva "Confirm email" → Guarda. Luego intenta de nuevo.'
          );
        } else if (statusStr.includes('503') || msg.includes('503')) {
          Alert.alert(
            'Servidor no disponible',
            'Supabase no pudo procesar la solicitud (Error 503). Puede ser que:\n\n1. Tu proyecto esté pausado\n2. No se haya ejecutado el SQL para crear la tabla "perfiles"\n\nRevisa tu panel de Supabase y asegúrate de haber corrido el script SQL.'
          );
        } else if (statusStr.includes('500') || msg.includes('500') || msg.includes('trigger') || msg.includes('function')) {
          Alert.alert(
            'Error en la base de datos',
            'El trigger que crea el perfil falló. Asegúrate de haber corrido el SQL completo del archivo supabase_schema.sql en el SQL Editor de Supabase.'
          );
        } else if (msg.includes('already registered') || msg.includes('already been registered')) {
          Alert.alert('Correo duplicado', 'Ya existe un usuario registrado con ese correo electrónico.');
        } else {
          Alert.alert('Error al crear', error.message || 'Error desconocido');
        }
      } else {
        Alert.alert('Éxito', 'Usuario creado correctamente.');
        setModalVisible(false);
        loadUsuarios();
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Usuarios</Text>
          <TouchableOpacity style={styles.headerRight} onPress={() => setLogoutMenuVisible(true)} activeOpacity={0.7}>
            <Text style={styles.roleText}>{(currentUser?.rol || 'USUARIO').toUpperCase()}</Text>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{currentUser?.nombre ? currentUser.nombre.charAt(0).toUpperCase() : 'U'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Feather name="search" size={20} color="#888" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, apellido o área"
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={[styles.filterButton, activeFiltersCount > 0 && { borderColor: '#5b1728', backgroundColor: '#fdf0f3' }]} onPress={() => setFilterModalVisible(true)}>
            <Feather name="filter" size={16} color={activeFiltersCount > 0 ? '#5b1728' : '#333'} />
            <Text style={[styles.filterText, activeFiltersCount > 0 && { color: '#5b1728' }]}>
              {activeFiltersCount > 0 ? `FILTROS (${activeFiltersCount})` : 'FILTROS'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta estadísticas */}
        <View style={styles.statsCard}>
          <Text style={styles.statsSubtitle}>TOTAL DE PERSONAL</Text>
          <Text style={styles.statsNumber}>{usuarios.length}</Text>
        </View>

        {/* Tarjeta de gestión */}
        <View style={styles.managementCard}>
          <Feather name="users" size={24} color="#fff" style={{ marginBottom: 12 }} />
          <Text style={styles.managementTitle}>Gestión de Personal</Text>
          <Text style={styles.managementDesc}>Control centralizado de identidades y unidades responsables.</Text>
        </View>

        {/* Lista */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Directorio de Usuarios</Text>
          <View style={styles.badgeLabel}>
            <Text style={styles.badgeText}>{filteredUsuarios.length} resultado{filteredUsuarios.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#5b1728" style={{ marginTop: 30 }} />
        ) : filteredUsuarios.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={40} color="#ddd" />
            <Text style={styles.emptyText}>No se encontraron usuarios</Text>
          </View>
        ) : (
          filteredUsuarios.map((item) => (
            <View key={item.id} style={styles.userCard}>
              <View style={styles.userCardLeft}>
                <View style={[styles.userAvatar, item.rol === 'admin' ? { backgroundColor: '#5b1728' } : item.rol === 'encargado' ? { backgroundColor: '#8b3a4a' } : {}]}>
                  <Text style={{ color: item.rol !== 'usuario' ? '#fff' : '#888', fontWeight: 'bold', fontSize: 16 }}>
                    {item.nombre.charAt(0)}{item.apellido_paterno.charAt(0)}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.apellido_paterno} {item.apellido_materno}, {item.nombre}</Text>
                  <Text style={styles.userRole}>{item.cargo.toUpperCase()} · {item.area.toUpperCase()}</Text>
                  <View style={styles.rolBadge}>
                    <Text style={styles.rolBadgeText}>{item.rol}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
                  <Feather name="edit-2" size={18} color="#5b1728" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                  <Feather name="trash-2" size={18} color="#c0392b" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={handleOpenAdd}>
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Modal Agregar / Editar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</Text>

            <ScrollView style={{ width: '100%' }} keyboardShouldPersistTaps="handled">
              {!isEditing && (
                <>
                  <Text style={styles.fieldLabel}>Correo electrónico *</Text>
                  <TextInput style={styles.inputBox} placeholder="Ej. usuario@empresa.com" placeholderTextColor="#bbb" value={form.email} onChangeText={t => setForm({ ...form, email: t })} autoCapitalize="none" keyboardType="email-address" />
                  <Text style={styles.fieldLabel}>Contraseña * (min. 8 caracteres, mayúscula y número)</Text>
                  <TextInput style={styles.inputBox} placeholder="Ej. Segura12" placeholderTextColor="#bbb" value={form.password} onChangeText={t => setForm({ ...form, password: t })} secureTextEntry />
                  <Text style={styles.fieldLabel}>Confirmar Contraseña *</Text>
                  <TextInput style={styles.inputBox} placeholder="Repite la contraseña" placeholderTextColor="#bbb" value={form.confirmPassword} onChangeText={t => setForm({ ...form, confirmPassword: t })} secureTextEntry />
                </>
              )}
              <Text style={styles.fieldLabel}>Nombre *</Text>
              <TextInput style={styles.inputBox} placeholder="Ej. Luis" placeholderTextColor="#bbb" value={form.nombre} onChangeText={t => setForm({ ...form, nombre: t })} />

              <Text style={styles.fieldLabel}>Apellido Paterno *</Text>
              <TextInput style={styles.inputBox} placeholder="Ej. García" placeholderTextColor="#bbb" value={form.apellido_paterno} onChangeText={t => setForm({ ...form, apellido_paterno: t })} />

              <Text style={styles.fieldLabel}>Apellido Materno</Text>
              <TextInput style={styles.inputBox} placeholder="Ej. López" placeholderTextColor="#bbb" value={form.apellido_materno} onChangeText={t => setForm({ ...form, apellido_materno: t })} />

              <Text style={styles.fieldLabel}>Cargo *</Text>
              <TextInput style={styles.inputBox} placeholder="Ej. Gerente de Logística" placeholderTextColor="#bbb" value={form.cargo} onChangeText={t => setForm({ ...form, cargo: t })} />

              <Text style={styles.fieldLabel}>Área / Unidad *</Text>
              <View style={styles.areaPickerContainer}>
                {AREAS_DISPONIBLES.map(area => (
                  <TouchableOpacity
                    key={area}
                    style={[styles.areaOption, form.area === area && styles.areaOptionActive]}
                    onPress={() => setForm({ ...form, area })}
                  >
                    <Text style={[styles.areaOptionText, form.area === area && { color: '#fff' }]}>{area}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 5 }]}>Rol en el sistema</Text>
              <View style={styles.rolePickerContainer}>
                {(['admin', 'encargado', 'usuario'] as const).map(rol => (
                  <TouchableOpacity
                    key={rol}
                    style={[styles.roleBtn, form.rol === rol && styles.roleBtnActive]}
                    onPress={() => setForm({ ...form, rol })}
                  >
                    <Text style={[styles.roleBtnText, form.rol === rol && styles.roleBtnTextActive]}>
                      {rol.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
                <Text style={styles.btnSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Filtros */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrar Usuarios</Text>

            <ScrollView style={{ width: '100%' }}>
              <Text style={styles.fieldLabel}>Por Rol</Text>
              <View style={styles.rolePickerContainer}>
                {['admin', 'encargado', 'usuario'].map(rol => (
                  <TouchableOpacity
                    key={rol}
                    style={[styles.roleBtn, filterRol === rol && styles.roleBtnActive]}
                    onPress={() => setFilterRol(filterRol === rol ? null : rol)}
                  >
                    <Text style={[styles.roleBtnText, filterRol === rol && styles.roleBtnTextActive]}>
                      {rol.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Por Área</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 }}>
                {areasUnicas.length === 0 ? (
                  <Text style={{ color: '#bbb', fontSize: 13 }}>No hay áreas registradas aún</Text>
                ) : (
                  areasUnicas.map(area => (
                    <TouchableOpacity
                      key={area}
                      style={[styles.areaBadge, filterArea === area && styles.areaBadgeActive]}
                      onPress={() => setFilterArea(filterArea === area ? null : area)}
                    >
                      <Text style={[styles.areaBadgeText, filterArea === area && { color: '#fff' }]}>{area}</Text>
                    </TouchableOpacity>
                  ))
                )}
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

      {/* Modal Cerrar Sesión */}
      <Modal visible={logoutMenuVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.logoutOverlay} activeOpacity={1} onPress={() => setLogoutMenuVisible(false)}>
          <View style={styles.logoutMenu}>
            <View style={styles.logoutMenuHeader}>
              <View style={styles.avatarCircleLg}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{currentUser?.nombre ? currentUser.nombre.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
              <Text style={styles.logoutMenuTitle}>{currentUser?.nombre || 'Usuario'}</Text>
              <Text style={styles.logoutMenuSubtitle}>{(currentUser?.rol || 'usuario').toUpperCase()} · Sesión activa</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={async () => {
                setLogoutMenuVisible(false);
                await AuthService.signOut();
                router.replace('/');
              }}
            >
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { padding: 20 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#5b1728' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  roleText: { fontSize: 10, fontWeight: 'bold', color: '#5b1728', marginRight: 8 },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#efefef', borderRadius: 20, paddingHorizontal: 15, height: 46, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  filterButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, height: 46 },
  filterText: { fontSize: 11, fontWeight: 'bold', color: '#333', marginLeft: 5 },

  statsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  statsSubtitle: { fontSize: 10, fontWeight: 'bold', color: '#999', letterSpacing: 1, marginBottom: 4 },
  statsNumber: { fontSize: 48, fontWeight: 'bold', color: '#111', marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  indicatorText: { fontSize: 12, color: '#666', marginRight: 8 },

  managementCard: { backgroundColor: '#5b1728', borderRadius: 22, padding: 24, marginBottom: 24, shadowColor: '#5b1728', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 6 },
  managementTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  managementDesc: { color: '#ffc1cd', fontSize: 13, lineHeight: 19 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginRight: 10 },
  badgeLabel: { backgroundColor: '#e8e8e8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, color: '#555' },

  emptyState: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  emptyText: { marginTop: 10, color: '#bbb', fontSize: 14 },

  userCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#5b1728' },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  userInfo: { flex: 1, paddingRight: 5 },
  userName: { fontSize: 13, fontWeight: 'bold', color: '#222', marginBottom: 1 },
  userRole: { fontSize: 10, color: '#888', marginBottom: 4 },
  rolBadge: { alignSelf: 'flex-start', backgroundColor: '#f4e8eb', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  rolBadgeText: { fontSize: 9, color: '#5b1728', fontWeight: 'bold', textTransform: 'uppercase' },
  userActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 8, marginLeft: 4 },

  fab: { position: 'absolute', bottom: 100, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center', shadowColor: '#5b1728', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 7 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 22, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#5b1728', marginBottom: 18, textAlign: 'center' },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 5, marginLeft: 2 },
  inputBox: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#d0d0d0', fontSize: 14, color: '#333' },

  rolePickerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginTop: 5 },
  roleBtn: { flex: 1, paddingVertical: 11, backgroundColor: '#eee', borderRadius: 10, marginRight: 6, alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#5b1728' },
  roleBtnText: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  roleBtnTextActive: { color: '#fff' },

  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btnCancel: { flex: 1, padding: 15, backgroundColor: '#eee', borderRadius: 12, marginRight: 10, alignItems: 'center' },
  btnCancelText: { fontWeight: 'bold', color: '#666' },
  btnSave: { flex: 1, padding: 15, backgroundColor: '#5b1728', borderRadius: 12, alignItems: 'center' },
  btnSaveText: { fontWeight: 'bold', color: '#fff' },

  areaBadge: { backgroundColor: '#eee', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8, marginBottom: 8 },
  areaBadgeActive: { backgroundColor: '#5b1728' },
  areaBadgeText: { fontSize: 12, color: '#555', fontWeight: '600' },

  areaPickerContainer: { flexDirection: 'column', marginBottom: 15 },
  areaOption: { backgroundColor: '#f0f0f0', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1.5, borderColor: '#e0e0e0' },
  areaOptionActive: { backgroundColor: '#5b1728', borderColor: '#5b1728' },
  areaOptionText: { fontSize: 13, color: '#444', fontWeight: '600' },

  logoutOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 100, paddingRight: 20 },
  logoutMenu: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  logoutMenuHeader: { alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatarCircleLg: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#5b1728', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoutMenuTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  logoutMenuSubtitle: { fontSize: 11, color: '#999', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#fff0f0', borderRadius: 12 },
  logoutBtnText: { fontSize: 14, fontWeight: 'bold', color: '#c0392b', marginLeft: 8 },
});
