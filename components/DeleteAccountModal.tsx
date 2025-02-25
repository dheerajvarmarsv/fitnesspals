import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export default function DeleteAccountModal({ visible, onClose, onConfirm, loading }: DeleteAccountModalProps) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (confirmText.toUpperCase() !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    try {
      setError(null);
      await onConfirm();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleClose = () => {
    setStep(1);
    setConfirmText('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {step === 1 ? (
            <>
              <Text style={styles.title}>Delete Account</Text>
              <Text style={styles.description}>
                Are you sure you want to permanently delete your account? This action cannot be undone and will delete all your data including:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• All your activities and achievements</Text>
                <Text style={styles.listItem}>• Your profile and settings</Text>
                <Text style={styles.listItem}>• Friend connections and requests</Text>
                <Text style={styles.listItem}>• Challenge participations</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Final Confirmation</Text>
              <Text style={styles.description}>
                To permanently delete your account, please type "DELETE" below:
              </Text>
              <TextInput
                style={styles.input}
                value={confirmText}
                onChangeText={text => {
                  setConfirmText(text);
                  setError(null);
                }}
                placeholder="Type DELETE"
                autoCapitalize="characters"
                editable={!loading}
              />
            </>
          )}

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, loading && styles.deleteButtonDisabled]}
              onPress={handleConfirm}
              disabled={loading || (step === 2 && confirmText.toUpperCase() !== 'DELETE')}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.deleteButtonText}>
                  {step === 1 ? 'Continue' : 'Delete Account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
  },
  listContainer: {
    marginBottom: 24,
  },
  listItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    minWidth: 100,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});