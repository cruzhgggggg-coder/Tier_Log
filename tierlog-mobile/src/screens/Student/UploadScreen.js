import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Button, Title, Card, ProgressBar } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { uploadConsultation } from '../../api/api';

const UploadScreen = ({ route, navigation }) => {
  const { studentId, isRevision = false, logId = null } = route.params || {};
  
  const [documentUri, setDocumentUri] = useState(null);
  const [documentName, setDocumentName] = useState('');
  
  const [audioUri, setAudioUri] = useState(null);
  const [audioName, setAudioName] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });
      if (!result.canceled) {
        setDocumentUri(result.assets[0].uri);
        setDocumentName(result.assets[0].name);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
      });
      if (!result.canceled) {
        setAudioUri(result.assets[0].uri);
        setAudioName(result.assets[0].name);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleUpload = async () => {
    if (!documentUri && !audioUri) {
      Alert.alert('Error', 'Pilih minimal satu file (Dokumen atau Audio) untuk diupload.');
      return;
    }

    setUploading(true);
    setProgress(0.2); 

    try {
      const formData = new FormData();
      formData.append('user_id', studentId); // backend CreateConsultation uses user_id
      
      if (documentUri) {
        formData.append('paper', { uri: documentUri, name: documentName, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      }
      
      if (audioUri) {
        formData.append('audio', { uri: audioUri, name: audioName, type: 'audio/mp3' });
      }

      await uploadConsultation(formData);
      
      setProgress(1);
      Alert.alert('Sukses', isRevision ? 'Revisi berhasil diupload' : 'Bimbingan berhasil disubmit', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      
    } catch (error) {
      setUploading(false);
      Alert.alert('Gagal', 'Terjadi kesalahan saat mengunggah file.');
      console.error(error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>{isRevision ? "Upload Revisi (UC08)" : "Bimbingan Baru (UC02 & UC03)"}</Title>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Dokumen Skripsi</Title>
          <Text style={styles.desc}>Upload bab skripsi dalam format PDF atau DOCX.</Text>
          <Button mode="outlined" icon="file-document" onPress={pickDocument} style={styles.pickBtn}>
            {documentName ? documentName : "Pilih Dokumen"}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Audio Bimbingan</Title>
          <Text style={styles.desc}>Upload rekaman suara bimbingan dengan dosen (MP3/WAV).</Text>
          <Button mode="outlined" icon="microphone" onPress={pickAudio} style={styles.pickBtn}>
            {audioName ? audioName : "Pilih Audio"}
          </Button>
        </Card.Content>
      </Card>

      {uploading && (
        <View style={styles.progressContainer}>
          <Text>Mengunggah... {Math.round(progress * 100)}%</Text>
          <ProgressBar progress={progress} color="#3f51b5" style={{ height: 8, marginTop: 5 }} />
        </View>
      )}

      <Button 
        mode="contained" 
        onPress={handleUpload} 
        disabled={uploading}
        loading={uploading}
        style={styles.submitBtn}
      >
        Submit Files
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    marginBottom: 20,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
  },
  desc: {
    color: '#666',
    marginBottom: 10,
    fontSize: 12,
  },
  pickBtn: {
    marginTop: 10,
  },
  progressContainer: {
    marginVertical: 15,
  },
  submitBtn: {
    marginTop: 10,
    paddingVertical: 5,
  }
});

export default UploadScreen;
