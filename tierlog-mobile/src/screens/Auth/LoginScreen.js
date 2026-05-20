import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Title } from 'react-native-paper';
import { login } from '../../api/api';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Silakan isi email dan password');
      return;
    }
    
    setLoading(true);
    try {
      // API call to our new Go backend /login endpoint
      const response = await login(email, password);
      const user = response.data.data;
      
      if (user.role === 'student') {
        navigation.replace('StudentDashboard', { user });
      } else if (user.role === 'lecturer') {
        navigation.replace('LecturerDashboard', { user });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Login Gagal', 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>TierLog Integrated System</Title>
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        mode="outlined"
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        mode="outlined"
      />
      
      <Button 
        mode="contained" 
        onPress={handleLogin} 
        loading={loading}
        style={styles.button}
      >
        Login
      </Button>

      <Button 
        onPress={() => navigation.navigate('Register')} 
        style={{marginTop: 10}}
      >
        Belum punya akun? Daftar
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3f51b5'
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  }
});

export default LoginScreen;
