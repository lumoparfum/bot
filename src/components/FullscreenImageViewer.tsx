import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
};

export function FullscreenImageViewer({ visible, images, initialIndex, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
    });
  }, [visible, initialIndex, width]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
        >
          {images.map((uri) => (
            <Pressable key={uri} style={{ width, height }} onPress={onClose}>
              <Image source={{ uri }} style={styles.image} contentFit="contain" />
            </Pressable>
          ))}
        </ScrollView>

        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((uri, i) => (
              <View key={uri} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 16,
  },
});
