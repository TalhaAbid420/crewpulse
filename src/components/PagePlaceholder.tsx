import { useEffect } from 'react'

type Props = {
  title: string
  description: string
  comingNext: string
}

// Temporary page body. Each page swaps this for real content later.
export function PagePlaceholder({ title, description, comingNext }: Props) {
  useEffect(() => {
    document.title = `${title} - CrewPulse`
  }, [title])

  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-prose text-muted">{description}</p>
      <div className="mt-8 rounded-lg border border-dashed border-line bg-panel p-6">
        <p className="font-medium">Nothing to show yet</p>
        <p className="mt-1 max-w-prose text-sm text-muted">{comingNext}</p>
      </div>
    </section>
  )
}
