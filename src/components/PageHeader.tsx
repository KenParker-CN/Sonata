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
    <div className="page-gutter pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </div>
  )
}
