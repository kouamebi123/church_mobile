import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Text, ScrollView, Dimensions } from 'react-native';
import { Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { apiService } from '../services/apiService';
import { API_BASE_URL } from '../config/apiConfig';
import i18nService from '../services/i18nService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CAROUSEL_HEIGHT = 380;

interface CarouselImage {
  id?: string;
  _id?: string;
  image_url: string;
}

export default function Carousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const response = await apiService.carousel.getAll();
        const data = response.data?.data || response.data || [];
        const imagesArray = Array.isArray(data) ? data : [];
        console.log('Carousel images loaded:', imagesArray.length);
        setImages(imagesArray);
        setError(null);
      } catch (err: any) {
        // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
        // Le carousel peut être vide sans problème
        console.log('Erreur lors du chargement du carousel:', err?.message || err);
        setImages([]);
        setError(null); // Ne pas afficher d'erreur, juste un carousel vide
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    }
  }, []);

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentSlide(slideIndex);
  };

  useEffect(() => {
    if (images.length > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: currentSlide * SCREEN_WIDTH, animated: false });
    }
  }, [images.length]);

  useEffect(() => {
    if (images.length > 0) {
      const interval = setInterval(() => {
        const nextIndex = (currentSlide + 1) % images.length;
        goToSlide(nextIndex);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentSlide, images.length, goToSlide]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#662d91" />
          <Text style={styles.loadingText}>{i18nService.t('common.actions.loading')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>{i18nService.t('home.carousel.noImages')}</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.carouselCard}>
        <View style={styles.cardContentWrapper}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            style={styles.scrollView}
          >
            {images.map((image, index) => {
              if (!image || !image.image_url) return null;
              
              const imageUrl = image.image_url.startsWith('http')
                ? image.image_url
                : `${API_BASE_URL}${image.image_url.startsWith('/') ? image.image_url : `/${image.image_url}`}`;

              return (
                <View key={image.id || image._id || index} style={styles.slideContainer}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                    style={styles.gradient}
                  />
                  
                  {/* Caption avec fond flou */}
                  <View style={styles.captionContainer}>
                    <BlurView intensity={15} tint="dark" style={styles.captionBlur}>
                      <View style={styles.caption}>
                        <Text style={styles.captionTitle}>
                          {i18nService.t('home.welcome.welcomeMessage')}
                        </Text>
                        <View style={styles.divider} />
                        <Text style={styles.captionSubtitle}>
                          {i18nService.t('home.welcome.subtitle')}
                        </Text>
                      </View>
                    </BlurView>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Indicators */}
          {images.length > 1 && (
            <View style={styles.indicators}>
              {images.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentSlide && styles.indicatorActive
                  ]}
                  onPress={() => goToSlide(index)}
                />
              ))}
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: CAROUSEL_HEIGHT,
    marginBottom: 16,
  },
  carouselCard: {
    width: '100%',
    height: CAROUSEL_HEIGHT,
    borderRadius: 0,
  },
  cardContentWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  scrollView: {
    width: '100%',
    height: '100%',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 85,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  captionBlur: {
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'rgba(102, 45, 145, 0.15)',
    padding: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  captionTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: {
    width: 100,
    height: 3,
    backgroundColor: '#662d91',
    borderRadius: 2,
    marginVertical: 12,
  },
  captionSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'white',
    textAlign: 'center',
  },
  indicators: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: '#662d91',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorCard: {
    width: '100%',
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  emptyCard: {
    width: '100%',
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
});

