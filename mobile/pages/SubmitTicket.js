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
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CheckCircle, ChevronLeft, Send } from 'lucide-react-native';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function SubmitTicket({ setView, setTrackCredentials, userEmail, userName, userPhone }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const [helpTopics, setHelpTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTopics, setFetchingTopics] = useState(true);
  const [error, setError] = useState('');
  
  const initialFormState = {
    name: userName || '',
    email: userEmail || '',
    phone: userPhone || '',
    help_topic_id: '',
    priority: 'Normal',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [createdTicket, setCreatedTicket] = useState(null);
  
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setFormData(prev => ({ 
      ...prev, 
      email: userEmail || prev.email,
      name: userName || prev.name,
      phone: userPhone || prev.phone
    }));
  }, [userEmail, userName, userPhone]);

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

  const handleCancel = () => {
    setView('user-dashboard');
  };

  const handleSubmit = async () => {
    setError('');

    if (!formData.name.trim()) return setError('Full Name is required.');
    if (!formData.email.trim()) return setError('Email Address is required.');
    const emailPattern = new RegExp('^\\S+@\\S+\\.\\S+$');
    if (!emailPattern.test(formData.email)) return setError('Please enter a valid email address.');

    const phoneDigits = (formData.phone || '').replace(/[^0-9]/g, '');
    if (phoneDigits.length !== 10) return setError('Phone Number must contain exactly 10 digits, no letters.');
    if (phoneDigits !== (formData.phone || '')) return setError('Phone Number must contain exactly 10 digits, no letters.');

    setLoading(true);

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      help_topic_id: formData.help_topic_id || (helpTopics[0]?.id?.toString() ?? '1'),
      priority: formData.priority || 'Normal',
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
          <Text style={styles.successTitle}>Ticket Submitted!</Text>
          <Text style={styles.successText}>
            Your support request has been registered. Save the reference number below to track progress.
          </Text>

          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Ticket Number</Text>
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
              onPress={() => setView('user-dashboard')}
            >
              <Text style={styles.btnSecondaryText}>Back to Tickets</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 60}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >

        {/* Back link */}
        <TouchableOpacity style={styles.backRow} onPress={handleCancel}>
          <ChevronLeft size={16} color="#475569" />
          <Text style={styles.backText}>Back to tickets</Text>
        </TouchableOpacity>

        {/* Page heading */}
        <Text style={styles.pageTitle}>New Support Ticket</Text>
        <Text style={styles.pageSubtitle}>
          Fill in the details below and we'll get back to you as soon as possible.
        </Text>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {fetchingTopics ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loaderText}>Loading form...</Text>
            </View>
          ) : (
            <View>
              {/* Row 1: Full Name + Email */}
              <View style={[styles.row, isWide && styles.rowWide]}>
                <View style={[styles.halfCol, isWide && styles.halfColWide]}>
                  <Text style={styles.fieldLabel}>
                    Full name <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Atchayas"
                    placeholderTextColor="#94A3B8"
                    value={formData.name}
                    onChangeText={(val) => handleChange('name', val)}
                  />
                </View>
                <View style={[styles.halfCol, isWide && styles.halfColWide]}>
                  <Text style={styles.fieldLabel}>
                    Email <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, !!userEmail && styles.disabledInput]}
                    placeholder="anil@test.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(val) => handleChange('email', val)}
                    editable={!userEmail}
                  />
                </View>
              </View>

              

              {/* Row 2: Phone + Priority */}
              <View style={[styles.row, isWide && styles.rowWide]}>
                <View style={[styles.halfCol, isWide && styles.halfColWide]}>
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="9345028839"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(val) => {
                      const digits = val.replace(/[^0-9]/g, '');
                      handleChange('phone', digits.slice(0, 10));
                    }}
                    maxLength={10}
                  />
                </View>
                <View style={[styles.halfCol, isWide && styles.halfColWide]}>
                  <Text style={styles.fieldLabel}>Priority</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.priority}
                      style={styles.picker}
                      onValueChange={(val) => handleChange('priority', val)}
                    >
                      <Picker.Item label="Low"       value="Low" />
                      <Picker.Item label="Normal"    value="Normal" />
                      <Picker.Item label="High"      value="High" />
                      <Picker.Item label="Emergency" value="Emergency" />
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Help Topic (hidden if only one) */}
              {helpTopics.length > 1 && (
                <>
                  <Text style={styles.fieldLabel}>Help Topic</Text>
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
                </>
              )}

              {/* Action Buttons */}
              <View style={styles.formActions}>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnSecondary]} 
                  onPress={handleCancel}
                  disabled={loading}
                >
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btn, styles.btnPrimary, { flex: 1 }]} 
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={styles.btnRow}>
                      <Send size={15} color="#FFFFFF" />
                      <Text style={styles.btnPrimaryText}>Submit Ticket</Text>
                    </View>
                  )}
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
    backgroundColor: '#F1F5F9',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 760,
    alignSelf: 'center',
    width: '100%',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
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
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
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
  row: {
    flexDirection: 'column',
    marginBottom: 8,
    width: '100%',
  },
  rowWide: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  halfCol: {
    width: '100%',
    minWidth: 0,
    marginBottom: 8,
  },
  halfColWide: {
    flex: 1,
    minWidth: 0,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 14,
  },
  required: {
    color: '#EF4444',
  },
  optional: {
    color: '#94A3B8',
    fontWeight: '400',
    fontSize: 12,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 14,
    color: '#0F172A',
  },
  disabledInput: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    borderColor: '#E5E7EB',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 140,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginTop: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? 130 : 46,
    color: '#0F172A',
  },
  formActions: {
    flexDirection: 'column',
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 20,
    justifyContent: 'flex-end',
  },
  btn: {
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#4F46E5',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    minWidth: 90,
  },
  btnSecondaryText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    borderTopWidth: 5,
    borderTopColor: '#10B981',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  codeContainer: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: 2,
  },
  successActions: {
    width: '100%',
  },
  actionButtonSpacing: {
    marginBottom: 10,
  },
  btnAccent: {
    backgroundColor: '#4F46E5',
    width: '100%',
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAccentText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
