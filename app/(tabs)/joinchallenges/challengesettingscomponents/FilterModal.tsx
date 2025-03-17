import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterOption {
  value: string;
  label: string;
  icon: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filterOptions: string[];
  activeFilter: string;
  onChangeFilter: (filter: string) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filterOptions,
  activeFilter,
  onChangeFilter,
}) => {
  // Map filter options to objects with label and icon
  const formattedOptions: FilterOption[] = filterOptions.map(option => {
    let label, icon;
    
    switch (option) {
      case 'race':
        label = 'Race';
        icon = 'flag';
        break;
      case 'survival':
        label = 'Survival';
        icon = 'flame';
        break;
      case 'streak':
        label = 'Streak';
        icon = 'infinite';
        break;
      case 'custom':
        label = 'Custom';
        icon = 'create';
        break;
      case 'all':
        label = 'All Types';
        icon = 'apps';
        break;
      default:
        label = option.charAt(0).toUpperCase() + option.slice(1);
        icon = 'bookmark';
    }
    
    return { value: option, label, icon };
  });

  const renderFilterOption = ({ item }: { item: FilterOption }) => {
    const isActive = activeFilter === item.value;
    
    return (
      <TouchableOpacity
        style={[
          styles.filterOption,
          isActive && styles.activeFilterOption
        ]}
        onPress={() => onChangeFilter(item.value)}
      >
        <View style={[
          styles.iconContainer,
          isActive && styles.activeIconContainer
        ]}>
          <Ionicons
            name={item.icon as any}
            size={20}
            color={isActive ? '#fff' : '#666'}
          />
        </View>
        <Text style={[
          styles.filterOptionText,
          isActive && styles.activeFilterOptionText
        ]}>
          {item.label}
        </Text>
        {isActive && (
          <Ionicons name="checkmark" size={20} color="#00000" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Challenges</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={formattedOptions}
                renderItem={renderFilterOption}
                keyExtractor={(item) => item.value}
                style={styles.optionsList}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    flex: 1,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeFilterOption: {
    backgroundColor: '#F5F8FF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activeIconContainer: {
    backgroundColor: '#00000',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  activeFilterOptionText: {
    fontWeight: '600',
    color: '#00000',
  },
});

export default FilterModal;