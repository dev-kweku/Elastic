    'use client'


    import { useRouter } from 'next/navigation'

    interface Props {
    current: string
    options: { value: string; label: string }[]
    params: Record<string, string | undefined>
    }

    export function SortDropdown({ current, options, params }: Props) {
    const router = useRouter()

    function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const newParams = new URLSearchParams()
        Object.entries(params).forEach(([k, v]) => { if (v && k !== 'sort' && k !== 'page') newParams.set(k, v) })
        newParams.set('sort', e.target.value)
        router.push(`/search?${newParams.toString()}`)
    }

    return (
        <select
        value={current}
        onChange={handleChange}
        className="input-base h-9 py-0 text-sm w-auto pr-8"
        >
        {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        </select>
    )
    }