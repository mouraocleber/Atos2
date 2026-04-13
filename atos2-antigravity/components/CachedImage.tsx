import React, { useState, useEffect } from 'react';
import { Image, ActivityIndicator, View, StyleSheet } from 'react-native';
import { getCachedMedia } from '../services/MediaCacheService';
import { Colors } from '../constants/theme';

interface CachedImageProps {
  url?: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  fallbackIcon?: React.ReactNode;
}

export default function CachedImage({ url, style, resizeMode = 'cover', fallbackIcon }: CachedImageProps) {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (url) {
      setLoading(true);
      getCachedMedia(url).then(cUrl => {
        if (mounted) {
          setCachedUrl(cUrl);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [url]);

  if (loading) {
    return (
      <View style={[style, styles.placeholder]}>
        <ActivityIndicator color={Colors.primary} size="small" />
      </View>
    );
  }

  if (!cachedUrl) {
    return (
      <View style={[style, styles.placeholder]}>
        {fallbackIcon}
      </View>
    );
  }

  return <Image source={{ uri: cachedUrl }} style={style} resizeMode={resizeMode} />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.light.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
