import { useLocation } from 'react-router-dom'

export default function Breadcrumb() {
  const location = useLocation()
  
  // Hide breadcrumb on overview pages that have their own page headers
  const hideOnOverview = ['/', '/library', '/artists', '/albums', '/playlists'].includes(location.pathname)
  if (hideOnOverview) {
    return null
  }
  
  const pathSegments = location.pathname.split('/').filter(Boolean)
  
  // Build breadcrumb trail from URL path
  const breadcrumbTrail: Array<{ label: string; isLast: boolean }> = []
  
  if (pathSegments.length === 0) {
    // Root path
    breadcrumbTrail.push({ label: 'Library', isLast: true })
  } else {
    // First segment is always the overview page
    const firstSegment = pathSegments[0]
    const overviewLabel = firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1)
    
    if (pathSegments.length === 1) {
      // Overview page only
      breadcrumbTrail.push({ label: overviewLabel, isLast: true })
    } else {
      // Detail page - show hierarchy
      breadcrumbTrail.push({ label: overviewLabel, isLast: false })
      
      // Add detail items based on route structure
      if (firstSegment === 'albums' && pathSegments.length >= 3) {
        // /albums/:albumArtist/:albumName
        const albumName = decodeURIComponent(pathSegments[2])
        breadcrumbTrail.push({ label: albumName, isLast: pathSegments.length === 3 })
        
        // If there's a 4th segment (shouldn't happen with current routes, but handle gracefully)
        for (let i = 3; i < pathSegments.length; i++) {
          breadcrumbTrail.push({ 
            label: decodeURIComponent(pathSegments[i]), 
            isLast: i === pathSegments.length - 1 
          })
        }
      } else if (firstSegment === 'artists' && pathSegments.length >= 2) {
        // /artists/:artistName
        const artistName = decodeURIComponent(pathSegments[1])
        breadcrumbTrail.push({ label: artistName, isLast: pathSegments.length === 2 })
        
        // If there are more segments (shouldn't happen with current routes)
        for (let i = 2; i < pathSegments.length; i++) {
          breadcrumbTrail.push({ 
            label: decodeURIComponent(pathSegments[i]), 
            isLast: i === pathSegments.length - 1 
          })
        }
      }
    }
  }
  
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-2 text-xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        {breadcrumbTrail.map((item, idx) => (
          <span key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <span className="text-muted-foreground/60">›</span>}
            <span
              className={
                item.isLast
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              }
            >
              {item.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
