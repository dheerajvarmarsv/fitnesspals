// // app/(tabs)/joinchallenges/challengesettingscomponents/FilterModal.tsx

// import React from 'react';
// import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';

// interface FilterModalProps {
//   visible: boolean;
//   onClose: () => void;
//   filterOptions: string[];   // e.g. ['all', 'race', 'survival', 'streak', 'custom']
//   activeFilter: string;      // e.g. 'all'
//   onChangeFilter: (option: string) => void;
// }

// export default function FilterModal({
//   visible,
//   onClose,
//   filterOptions,
//   activeFilter,
//   onChangeFilter,
// }: FilterModalProps) {
//   return (
//     <Modal
//       visible={visible}
//       transparent={true}
//       animationType="fade"
//       onRequestClose={onClose}
//     >
//       <TouchableOpacity
//         style={styles.modalOverlay}
//         activeOpacity={1}
//         onPress={onClose}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>Filter Challenges</Text>

//             {filterOptions.map((option) => (
//               <TouchableOpacity
//                 key={option}
//                 style={[
//                   styles.filterOption,
//                   activeFilter === option && styles.filterOptionActive,
//                 ]}
//                 onPress={() => onChangeFilter(option)}
//               >
//                 <Text
//                   style={[
//                     styles.filterOptionText,
//                     activeFilter === option && styles.filterOptionTextActive,
//                   ]}
//                 >
//                   {option === 'all'
//                     ? 'All Types'
//                     : option.charAt(0).toUpperCase() + option.slice(1)}
//                 </Text>
//                 {activeFilter === option && (
//                   <Ionicons name="checkmark" size={20} color="#4A90E2" />
//                 )}
//               </TouchableOpacity>
//             ))}

//             <TouchableOpacity
//               style={styles.modalCloseButton}
//               onPress={onClose}
//             >
//               <Text style={styles.modalCloseButtonText}>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </TouchableOpacity>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContainer: {
//     width: '80%',
//     maxWidth: 400,
//   },
//   modalContent: {
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     padding: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   filterOption: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   filterOptionActive: {
//     backgroundColor: '#f0f8ff',
//   },
//   filterOptionText: {
//     fontSize: 16,
//     color: '#333',
//   },
//   filterOptionTextActive: {
//     color: '#4A90E2',
//     fontWeight: '600',
//   },
//   modalCloseButton: {
//     backgroundColor: '#f0f0f0',
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 20,
//   },
//   modalCloseButtonText: {
//     color: '#333',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../lib/theme'; // Adjust the path as needed

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  activeFilter: string;
  onChangeFilter: (option: string) => void;
}

export default function FilterModal({
  visible,
  onClose,
  activeFilter,
  onChangeFilter,
}: FilterModalProps) {
  // Only show "race" and "survival" options
  const options = ['race', 'survival'];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Challenges</Text>

            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.filterOption,
                  activeFilter === option && styles.filterOptionActive,
                ]}
                onPress={() => onChangeFilter(option)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    activeFilter === option && styles.filterOptionTextActive,
                  ]}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
                {activeFilter === option && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.card,
    padding: theme.spacing.medium,
    ...theme.shadows.medium,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.medium,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterOptionActive: {
    backgroundColor: 'rgba(74,144,226,0.1)',
  },
  filterOptionText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
  },
  filterOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: theme.spacing.medium,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    marginTop: theme.spacing.medium,
  },
  modalCloseButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
});