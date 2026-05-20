import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import { getConsultations } from '../../api/api';

const LecturerDashboard = ({ route, navigation }) => {
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
      // Wait, we probably need to filter logs by lecturer's students.
      // But for prototype, we just show all or filter if possible.
      setLogs(response.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('ValidationScreen', { log: item })}>
      <Card.Content>
        <Title>Log Bimbingan #{item.id}</Title>
        <Paragraph>Mahasiswa ID: {item.student_id}</Paragraph>
        <Paragraph>Tanggal: {new Date(item.created_at).toLocaleDateString()}</Paragraph>
        <Paragraph style={{ marginTop: 10, color: 'blue' }}>Validasi Feedback (UC06) / Approve (UC10) &gt;</Paragraph>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Title style={styles.headerTitle}>Dashboard Dosen: {user?.lecturer?.name}</Title>
      
      {loading ? (
        <ActivityIndicator animating={true} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Paragraph style={styles.empty}>Belum ada data bimbingan.</Paragraph>}
        />
      )}
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
  }
});

export default LecturerDashboard;
