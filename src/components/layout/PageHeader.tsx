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
      <p className="section-kicker mb-2">Your collection</p>
      <h1 className="text-3xl font-bold tracking-[-0.03em] text-foreground">{title}</h1>
    </div>
  )
}
