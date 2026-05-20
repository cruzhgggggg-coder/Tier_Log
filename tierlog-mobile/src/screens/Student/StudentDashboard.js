import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, ActivityIndicator } from 'react-native-paper';
import { getConsultations } from '../../api/api';

const StudentDashboard = ({ route, navigation }) => {
  const { user } = route.params || {};
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await getConsultations();
      // Filter based on student if the backend doesn't filter it
      const studentLogs = response.data.data.filter(log => log.student_id === user?.student?.id);
      setLogs(studentLogs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('FeedbackScreen', { log: item })}>
      <Card.Content>
        <Title>Log #{item.id}</Title>
        <Paragraph>Tanggal: {new Date(item.created_at).toLocaleDateString()}</Paragraph>
        <Paragraph>File Audio: {item.audio_filename ? 'Ada' : 'Kosong'}</Paragraph>
        <Paragraph>File Skripsi: {item.paper_filename ? 'Ada' : 'Kosong'}</Paragraph>
        <Paragraph style={{ marginTop: 10, color: 'green' }}>Lihat Feedback (UC07) &gt;</Paragraph>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Title style={styles.headerTitle}>Halo, {user?.student?.name}</Title>
      
      {loading ? (
        <ActivityIndicator animating={true} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Paragraph style={styles.empty}>Belum ada riwayat bimbingan.</Paragraph>}
        />
      )}

      {/* FAB for UC02/UC03 (Upload Dokumen & Audio) */}
      <FAB
        style={styles.fab}
        small
        icon="plus"
        label="Bimbingan Baru"
        onPress={() => navigation.navigate('UploadScreen', { studentId: user?.student?.id })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerTitle: {
    padding: 20,
    fontSize: 22,
    backgroundColor: '#fff',
    elevation: 2,
  },
  listContainer: {
    padding: 15,
  },
  card: {
    marginBottom: 15,
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    color: '#888'
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3f51b5'
  },
});

export default StudentDashboard;
