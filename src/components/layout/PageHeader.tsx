import {Typography} from '@mui/material'

interface PageHeaderProps {
  title: string
}

/**
 * List-page header. Library, Albums, Artists, Composers and Playlists all
 * render this. The title stands alone: what the collection is gets said once
 * here, and the toolbar below names the section it orders.
 */
export default function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="page-gutter border-b border-border/60 bg-background/80 pb-5 pt-7 backdrop-blur-sm">
      <Typography
        component="p"
        variant="overline"
        className="section-kicker mb-2"
        sx={{display: 'block', lineHeight: 1}}
      >
        Your collection
      </Typography>
      <Typography component="h1" variant="h4" sx={{fontWeight: 700, letterSpacing: '-0.03em'}}>
        {title}
      </Typography>
    </div>
  )
}
