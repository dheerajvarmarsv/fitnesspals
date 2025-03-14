// PagerView.web.js - Web implementation
import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';

const PagerView = forwardRef(({ 
  style,
  initialPage = 0,
  onPageSelected,
  children,
  ...props
}, ref) => {
  const [activePage, setActivePage] = useState(initialPage);

  // Expose setPage method to parent
  useImperativeHandle(ref, () => ({
    setPage: (page) => {
      setActivePage(page);
      if (onPageSelected) {
        onPageSelected({ nativeEvent: { position: page } });
      }
    }
  }));

  return (
    <View style={[styles.container, style]}>
      {React.Children.map(children, (child, index) => {
        if (index === activePage) {
          return child;
        }
        return null;
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default PagerView;