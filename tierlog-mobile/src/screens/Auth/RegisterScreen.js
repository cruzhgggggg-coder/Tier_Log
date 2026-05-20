import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Text, Title, RadioButton } from 'react-native-paper';
import { register } from '../../api/api';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [identifier, setIdentifier] = useState(''); // NIM or NIP
  const [department, setDepartment] = useState(''); // Prodi or Faculty
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !identifier) {
      Alert.alert('Error', 'Silakan isi semua field wajib.');
      return;
    }
    
    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        role,
        identifier,
        department
      });
      
      Alert.alert('Sukses', 'Registrasi berhasil. Silakan login.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat registrasi. Pastikan email belum digunakan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>Daftar Akun Baru (UC01)</Title>
      
      <TextInput label="Nama Lengkap" value={name} onChangeText={setName} style={styles.input} mode="outlined" />
      <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} mode="outlined" />
      <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} mode="outlined" />
      
      <View style={styles.radioGroup}>
        <Text style={styles.radioLabel}>Peran:</Text>
        <RadioButton.Group onValueChange={newValue => setRole(newValue)} value={role}>
          <View style={styles.radioItem}>
            <RadioButton value="student" />
            <Text>Mahasiswa</Text>
          </View>
          <View style={styles.radioItem}>
            <RadioButton value="lecturer" />
            <Text>Dosen</Text>
          </View>
        </RadioButton.Group>
      </View>

      <TextInput 
        label={role === 'student' ? "NIM" : "NIP"} 
        value={identifier} 
        onChangeText={setIdentifier} 
        style={styles.input} 
        mode="outlined" 
      />
      
      <TextInput 
        label={role === 'student' ? "Program Studi" : "Fakultas"} 
        value={department} 
        onChangeText={setDepartment} 
        style={styles.input} 
        mode="outlined" 
      />
      
      <Button mode="contained" onPress={handleRegister} loading={loading} style={styles.button}>
        Daftar
      </Button>
      
      <Button onPress={() => navigation.goBack()} style={styles.linkButton}>
        Sudah punya akun? Login di sini
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 22,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 10,
  },
  radioGroup: {
    marginVertical: 10,
  },
  radioLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    marginTop: 20,
    paddingVertical: 5,
  },
  linkButton: {
    marginTop: 10,
  }
});

export default RegisterScreen;
