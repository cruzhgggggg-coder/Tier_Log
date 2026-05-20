import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';

// Screens
import LoginScreen from './src/screens/Auth/LoginScreen';
import RegisterScreen from './src/screens/Auth/RegisterScreen';
import StudentDashboard from './src/screens/Student/StudentDashboard';
import UploadScreen from './src/screens/Student/UploadScreen';
import FeedbackScreen from './src/screens/Student/FeedbackScreen';
import LecturerDashboard from './src/screens/Lecturer/LecturerDashboard';
import ValidationScreen from './src/screens/Lecturer/ValidationScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ title: 'Daftar Akun' }} 
          />
          <Stack.Screen 
            name="StudentDashboard" 
            component={StudentDashboard} 
            options={{ title: 'Beranda Mahasiswa', headerBackVisible: false }} 
          />
          <Stack.Screen 
            name="UploadScreen" 
            component={UploadScreen} 
            options={{ title: 'Upload File' }} 
          />
          <Stack.Screen 
            name="FeedbackScreen" 
            component={FeedbackScreen} 
            options={{ title: 'Detail Feedback' }} 
          />
          <Stack.Screen 
            name="LecturerDashboard" 
            component={LecturerDashboard} 
            options={{ title: 'Beranda Dosen', headerBackVisible: false }} 
          />
          <Stack.Screen 
            name="ValidationScreen" 
            component={ValidationScreen} 
            options={{ title: 'Validasi & Approval' }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
