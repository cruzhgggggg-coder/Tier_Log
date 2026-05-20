import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Title, Card, Chip, Button } from 'react-native-paper';

const FeedbackScreen = ({ route, navigation }) => {
  const { log } = route.params || {};
  const [feedbackItems, setFeedbackItems] = useState([]);

  useEffect(() => {
    // In a real app, you might fetch /api/consultation/:id/feedback
    // But since the models struct shows feedback is preloaded in consultation logs (if populated),
    // we can use log.feedback_items. For now, let's mock some data if it's empty to demonstrate UC07.
    
    if (log && log.feedback_items && log.feedback_items.length > 0) {
      setFeedbackItems(log.feedback_items);
    } else {
      // Mock Data based on the struct (Category: Minor/Major, Status: Fixed/Pending)
      setFeedbackItems([
        { id: 1, content: 'Perbaiki format daftar pustaka sesuai APA style.', category: 'Minor', status: 'Pending' },
        { id: 2, content: 'Tambahkan metodologi penelitian yang lebih detail di Bab 3.', category: 'Major', status: 'Pending' },
        { id: 3, content: 'Typo di halaman 4 pada kata "implimentasi".', category: 'Minor', status: 'Fixed' },
      ]);
    }
  }, [log]);

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.feedbackText}>{item.content}</Text>
        <View style={styles.chipContainer}>
          <Chip 
            icon="label" 
            style={[styles.chip, { backgroundColor: item.category === 'Major' ? '#ffcdd2' : '#e2f1f8' }]}
            textStyle={{ color: item.category === 'Major' ? '#c62828' : '#0277bd' }}
          >
            {item.category} ( {item.category === 'Major' ? 'HOC' : 'LOC'} )
          </Chip>
          
          <Chip 
            icon={item.status === 'Fixed' ? "check" : "clock-outline"} 
            style={[styles.chip, { backgroundColor: item.status === 'Fixed' ? '#c8e6c9' : '#fff9c4' }]}
          >
            {item.status}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Feedback Terklasifikasi (UC07)</Title>
      <Text style={styles.subtitle}>Bimbingan #{log?.id || 'MOCK'}</Text>

      <FlatList
        data={feedbackItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada feedback.</Text>}
      />

      <Button 
        mode="contained" 
        icon="upload" 
        style={styles.uploadBtn}
        onPress={() => navigation.navigate('UploadScreen', { isRevision: true, logId: log?.id })}
      >
        Upload Revisi (UC08)
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    color: '#666',
  },
  listContainer: {
    padding: 15,
  },
  card: {
    marginBottom: 10,
    elevation: 1,
  },
  feedbackText: {
    fontSize: 14,
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
  },
  empty: {
    textAlign: 'center',
    marginTop: 30,
    color: '#888'
  },
  uploadBtn: {
    margin: 20,
    paddingVertical: 5,
  }
});

export default FeedbackScreen;
