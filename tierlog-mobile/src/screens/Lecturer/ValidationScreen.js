import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Title, Card, Button, Switch, Paragraph, Divider } from 'react-native-paper';

import { validateFeedback, approveRevision } from '../../api/api';

const ValidationScreen = ({ route, navigation }) => {
  const { log } = route.params || {};
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    // In a real app we would get this from `log.FeedbackItems` if it's preloaded.
    if (log && log.FeedbackItems) {
      setFeedbackItems(log.FeedbackItems.map(f => ({...f, isValidated: f.status === 'Fixed'})));
    } else {
      setFeedbackItems([
        { id: 1, content: 'Perbaiki format daftar pustaka sesuai APA style.', category: 'Minor', isValidated: false },
        { id: 2, content: 'Tambahkan metodologi penelitian yang lebih detail di Bab 3.', category: 'Major', isValidated: true },
      ]);
    }
  }, [log]);

  const toggleValidation = (id) => {
    setFeedbackItems(items => 
      items.map(item => item.id === id ? { ...item, isValidated: !item.isValidated } : item)
    );
  };

  const handleSaveValidation = async () => {
    setSaving(true);
    try {
      // Find items that are validated and send to API
      const toValidate = feedbackItems.filter(item => item.isValidated);
      for (const item of toValidate) {
        // If it's a real id (not mock), call API
        if (log && log.id) {
          await validateFeedback(item.id);
        }
      }
      
      Alert.alert('Sukses', 'Validasi Feedback AI berhasil disimpan (UC06)');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal menyimpan validasi');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveRevision = async () => {
    setApproving(true);
    try {
      if (log && log.id) {
        await approveRevision(log.id);
      } else {
        await new Promise(res => setTimeout(res, 1000));
      }
      Alert.alert('Disetujui', 'Revisi telah di-approve (UC10)', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal melakukan approval');
    } finally {
      setApproving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>Validasi Bimbingan #{log?.id || 'MOCK'}</Title>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Transkrip AI</Title>
          <Paragraph style={styles.transcript}>
            {log?.transcript_text || "Ini adalah mock transkrip percakapan bimbingan antara dosen dan mahasiswa yang dihasilkan oleh AI STT (UC04)."}
          </Paragraph>
        </Card.Content>
      </Card>

      <Title style={styles.subtitle}>Validasi Feedback AI (UC06)</Title>
      {feedbackItems.map(item => (
        <Card key={item.id} style={styles.feedbackCard}>
          <Card.Content>
            <Paragraph>{item.content}</Paragraph>
            <View style={styles.validationRow}>
              <Text style={{ color: item.category === 'Major' ? 'red' : 'blue' }}>[{item.category}]</Text>
              <View style={styles.switchContainer}>
                <Text>Valid?</Text>
                <Switch value={item.isValidated} onValueChange={() => toggleValidation(item.id)} />
              </View>
            </View>
          </Card.Content>
        </Card>
      ))}

      <Button mode="contained" onPress={handleSaveValidation} loading={saving} style={styles.btn}>
        Simpan Validasi
      </Button>

      <Divider style={styles.divider} />

      <Title style={styles.subtitle}>Approval Dokumen (UC10)</Title>
      <Paragraph style={styles.info}>Jika mahasiswa sudah melakukan revisi, Anda dapat menyetujuinya di sini.</Paragraph>
      <Button mode="outlined" onPress={handleApproveRevision} loading={approving} style={styles.btn} color="green">
        Approve Revisi
      </Button>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 10,
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 5,
  },
  transcript: {
    fontStyle: 'italic',
    color: '#444',
  },
  feedbackCard: {
    marginBottom: 10,
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btn: {
    marginTop: 10,
    paddingVertical: 5,
  },
  divider: {
    marginVertical: 20,
    height: 1,
  },
  info: {
    color: '#666',
    marginBottom: 10,
  }
});

export default ValidationScreen;
