import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Animated
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CheckCircle, Info } from 'lucide-react-native';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function SubmitTicket({ setView, setTrackCredentials }) {
  const [helpTopics, setHelpTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTopics, setFetchingTopics] = useState(true);
  const [error, setError] = useState('');
  
  const initialFormState = {
    name: '',
    email: '',
    phone: '',
    help_topic_id: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [createdTicket, setCreatedTicket] = useState(null);
  
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (createdTicket) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [createdTicket]);

  // Fetch help topics from Express backend
  useEffect(() => {
    fetchWithTimeout(`${API_BASE_URL}/api/help-topics`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load help topics');
        return res.json();
      })
      .then(data => {
        setHelpTopics(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, help_topic_id: data[0].id.toString() }));
        }
        setFetchingTopics(false);
      })
      .catch(err => {
        console.error(err);
        setError('Connection error. Is the server running?');
        setFetchingTopics(false);
      });
  }, []);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData(initialFormState);
    if (helpTopics.length > 0) {
      setFormData(prev => ({ ...prev, help_topic_id: helpTopics[0].id.toString() }));
    }
    setError('');
  };

  const handleCancel = () => {
    setView('home');
  };

  const handleSubmit = async () => {
    setError('');

    // Native validation checks (only for the 4 fields)
    if (!formData.email.trim()) return setError('Email Address is required.');
    if (!/\S+@\S+\.\S+/.test(formData.email)) return setError('Please enter a valid email address.');
    if (!formData.name.trim()) return setError('Full Name is required.');
    if (!formData.phone.trim()) return setError('Phone Number is required.');
    if (!formData.help_topic_id) return setError('Help Topic is required.');

    setLoading(true);

    // Get the name of the selected topic for default subject/desc
    const selectedTopic = helpTopics.find(t => t.id.toString() === formData.help_topic_id);
    const topicName = selectedTopic ? selectedTopic.name : 'General Inquiry';

    // Build payload satisfying the backend's validations
    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      help_topic_id: formData.help_topic_id,
      priority: 'Low',
      subject: `Support Request - ${topicName}`,
      description: `Support ticket opened via mobile app for Help Topic: ${topicName}. Contact phone: ${formData.phone}`
    };

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server failed to save ticket');
      }

      setCreatedTicket({
        ticketNumber: data.ticketNumber,
        email: formData.email
      });
    } catch (err) {
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackCreatedTicket = () => {
    if (createdTicket) {
      setTrackCredentials({
        email: createdTicket.email,
        ticketNumber: createdTicket.ticketNumber
      });
      setView('track-ticket');
    }
  };

  // SUCCESS SUBMISSION SCREEN
  if (createdTicket) {
    return (
      <View style={styles.successContainer}>
        <Animated.View style={[styles.successCard, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <CheckCircle size={60} color="#10B981" style={styles.successIcon} />
          <Text style={styles.successTitle}>Ticket Logged Successfully!</Text>
          <Text style={styles.successText}>
            Your service request has been registered. Please save the reference number below to track active progress.
          </Text>

          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{createdTicket.ticketNumber}</Text>
          </View>

          <View style={styles.successActions}>
            <TouchableOpacity 
              style={[styles.btn, styles.btnAccent]} 
              onPress={handleTrackCreatedTicket}
            >
              <Text style={styles.btnAccentText}>Track Ticket Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, styles.btnSecondary]} 
              onPress={() => setView('home')}
            >
              <Text style={styles.btnSecondaryText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  const selectedTopicDesc = helpTopics.find(t => t.id.toString() === formData.help_topic_id)?.description || '';

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Open a New Ticket</Text>
          <Text style={styles.subtitle}>Please fill in the form below to open a new ticket.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {fetchingTopics ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text style={styles.loaderText}>Loading help topics...</Text>
            </View>
          ) : (
            <View>
              {/* Contact Information */}
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <Text style={styles.fieldLabel}>Email Address <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="customer@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(val) => handleChange('email', val)}
              />

              <Text style={styles.fieldLabel}>Full Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="First and last name"
                placeholderTextColor="#94A3B8"
                value={formData.name}
                onChangeText={(val) => handleChange('name', val)}
              />

              <Text style={styles.fieldLabel}>Phone Number <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +91 9876543210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(val) => handleChange('phone', val)}
              />

              {/* Help Topic */}
              <Text style={styles.sectionTitle}>Help Topic</Text>

              <Text style={styles.fieldLabel}>Help Topic <Text style={styles.required}>*</Text></Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.help_topic_id}
                  style={styles.picker}
                  onValueChange={(itemValue) => handleChange('help_topic_id', itemValue)}
                >
                  {helpTopics.map(topic => (
                    <Picker.Item key={topic.id} label={topic.name} value={topic.id.toString()} />
                  ))}
                </Picker>
              </View>
              {selectedTopicDesc ? (
                <View style={styles.infoBox}>
                  <Info size={14} color="#3B82F6" style={styles.infoIcon} />
                  <Text style={styles.infoText}>{selectedTopicDesc}</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.formActions}>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnPrimary]} 
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Create Ticket</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btn, styles.btnSecondary, { flex: 0.5 }]} 
                  onPress={handleReset}
                  disabled={loading}
                >
                  <Text style={styles.btnSecondaryText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btn, styles.btnSecondary, { flex: 0.5 }]} 
                  onPress={handleCancel}
                  disabled={loading}
                >
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loaderText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FAFCFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: '#FAFCFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 45,
    color: '#0F172A',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 6,
    gap: 8,
    marginBottom: 12,
  },
  infoIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 15,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  btn: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#1E40AF',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnSecondaryText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  successContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderTopWidth: 6,
    borderTopColor: '#10B981',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  codeContainer: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: 1.5,
  },
  successActions: {
    width: '100%',
    gap: 8,
  },
  btnAccent: {
    backgroundColor: '#3B82F6',
    width: '100%',
  },
  btnAccentText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
