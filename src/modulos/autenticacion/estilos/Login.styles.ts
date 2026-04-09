import { StyleSheet } from 'react-native';

export const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 60, // Ajuste para que quede en la parte superior respetando el area segura
    alignItems: 'center', // Logo centrado
    width: '100%',
  },
  logo: {
    width: 170,
    height: 170,
    borderRadius: 80, // Mantiene el logo en formato circular 
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 20, // Sube el texto e inputs
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
    color: 'rgb(91, 23, 40)', // Color del botón
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 36,
  },
  input: {
    width: '100%',
    height: 54,
    backgroundColor: '#f8f9fa',
    borderRadius: 50, // Estilo pastilla
    paddingHorizontal: 20,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    color: '#333333',
  },
  passwordContainer: {
    width: '100%',
    height: 54,
    backgroundColor: '#f8f9fa',
    borderRadius: 50, // Estilo pastilla
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingLeft: 20,
    paddingRight: 10,
    fontSize: 16,
    color: '#333333',
  },
  eyeIcon: {
    padding: 10,
    paddingRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 54,
    backgroundColor: 'rgb(91, 23, 40)', // Color solicitado (rojo oscuro o similar)
    borderRadius: 50, // Estilo pastilla
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: 'rgb(91, 23, 40)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomGradient: {
    flex: 1,
    minHeight: 150,
  },
});
