import { ImageLoader } from '@/components/ui/image-loader'
import type { ImageLoaderProps } from '@/components/ui/image-loader'
import { ART } from '@/data/art'
import type { ArtName } from '@/data/art'

type ArtProps = { name: ArtName } & Omit<ImageLoaderProps, 'src' | 'width' | 'height' | 'placeholder' | 'placeholderKind'>

/** A site image by name (see scripts/art-placeholders.py): its size and silhouette come from ART. */
export function Art({ name, ...props }: ArtProps) {
  return <ImageLoader {...ART[name]} {...props} />
}
