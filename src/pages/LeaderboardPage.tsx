import { useCallback, useEffect, useState } from 'react'
import { gameDefinitions } from '../utils/games'
import { isInIframe, portalApiBase } from '../utils/iframe'

type Period = 'daily' | 'all'
type TabSlug = 'overall' | string

interface DailyEntry {
  rank: number
  address: string
  game: string
  score: number
}

interface AllTimeGameEntry {
  rank: number
  account: string
  plAccount: string | null
  game: string
  earnedPoints: number
  bestScore: number
  runs: number
  claims: number
  playDays: number
  legacyOnly: boolean
}

interface OverallAirdropEntry {
  rank: number
  account: string
  airdropPoints: number
  airdropCap: number
  earnedPoints: number
  bestScore: number
  playDays: number
  gamesPlayed: number
  runs: number
  claims: number
}

interface AirdropSummary {
  scoresSince: string
  plAndRunSumSince: string
  totalPlayers: number
  totalAirdropPoints: number
  totalEarnedPoints: number
  totalRuns: number
  totalClaims: number
}

const PORTAL = portalApiBase()

function formatAccount(addr: string): string {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}

export function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('all')
  const [game, setGame] = useState<TabSlug>('overall')
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([])
  const [overallEntries, setOverallEntries] = useState<OverallAirdropEntry[]>([])
  const [byGame, setByGame] = useState<Record<string, AllTimeGameEntry[]>>({})
  const [summary, setSummary] = useState<AirdropSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dayUtc, setDayUtc] = useState('')
  const embedded = isInIframe()

  const load = useCallback(async () => {
    if (!PORTAL) {
      setError(
        'Set VITE_PORTAL_API_URL to your Falcon Ledger origin to load live boards (e.g. http://localhost:3000).',
      )
      setDailyEntries([])
      setOverallEntries([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (period === 'all') {
        const q = new URLSearchParams({
          period: 'all',
          limit: '25',
        })
        const r = await fetch(`${PORTAL}/api/arcade/leaderboard?${q}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        setOverallEntries(data.overallEntries ?? [])
        setByGame(data.byGame ?? {})
        setSummary(data.airdropSummary ?? null)
        setDayUtc(data.dayUtc ?? '')
      } else {
        const q = new URLSearchParams({
          period: 'daily',
          limit: '25',
        })
        if (game !== 'overall') q.set('game', game)
        const r = await fetch(`${PORTAL}/api/arcade/leaderboard?${q}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        setDailyEntries(data.entries ?? [])
        setDayUtc(data.dayUtc ?? '')
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not load leaderboard from portal',
      )
      setDailyEntries([])
    } finally {
      setLoading(false)
    }
  }, [period, game])

  useEffect(() => {
    void load()
    const id = window.setInterval(load, 30_000)
    return () => window.clearInterval(id)
  }, [load])

  const gameEntries = game !== 'overall' ? (byGame[game] ?? []) : []

  return (
    <section className="page-panel">
      <span className="section-label">Leaderboard</span>
      <h2 className="page-title">Arcade Leaderboard</h2>
      <p className="page-copy">
        {period === 'daily'
          ? `Best single run per wallet for the current UTC day${dayUtc ? ` (${dayUtc})` : ''}.`
          : 'All-time scores per game and overall airdrop totals (shared with the Falcon Ledger portal).'}
      </p>

      <div className="page-actions" style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className={period === 'daily' ? 'button-primary' : 'button-secondary'}
          onClick={() => setPeriod('daily')}
        >
          Daily (UTC)
        </button>
        <button
          type="button"
          className={period === 'all' ? 'button-primary' : 'button-secondary'}
          onClick={() => setPeriod('all')}
        >
          All-time
        </button>
      </div>

      <div className="page-actions" style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className={game === 'overall' ? 'button-primary' : 'button-secondary'}
          onClick={() => setGame('overall')}
        >
          {period === 'all' ? 'Overall (Airdrop)' : 'All Games'}
        </button>
        {gameDefinitions.map((g) => (
          <button
            key={g.slug}
            type="button"
            className={
              game === g.slug ? 'button-primary' : 'button-secondary'
            }
            onClick={() => setGame(g.slug)}
          >
            {g.mode}
          </button>
        ))}
      </div>

      {period === 'all' && summary && (
        <p className="page-copy" style={{ marginTop: '0.9rem' }}>
          Airdrop pool: <strong>{summary.totalPlayers}</strong> PL players ·{' '}
          <strong>{summary.totalAirdropPoints.toFixed(1)}</strong> airdrop pts ·{' '}
          <strong>{summary.totalEarnedPoints.toLocaleString()}</strong> earned run pts (since {summary.plAndRunSumSince} UTC)
        </p>
      )}

      {loading && <p className="page-copy">Loading…</p>}
      {error && (
        <p className="page-copy" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      {!loading && !error && period === 'daily' && dailyEntries.length === 0 && (
        <p className="page-copy">
          No scores yet today. Play a run or switch to All-time to see overall
          airdrop standings.
        </p>
      )}

      {period === 'daily' && dailyEntries.length > 0 && (
        <ol className="leaderboard-list">
          {dailyEntries.map((e) => (
            <li key={`${e.rank}-${e.address}-${e.game}`}>
              <span>
                #{e.rank}{' '}
                <span className="wallet-chip">
                  {formatAccount(e.address)}
                </span>
              </span>
              <strong>{Math.floor(e.score).toLocaleString()}</strong>
            </li>
          ))}
        </ol>
      )}

      {!loading && !error && period === 'all' && game === 'overall' && overallEntries.length === 0 && (
        <p className="page-copy">
          No PL-linked arcade scores recorded yet.
        </p>
      )}

      {period === 'all' && game === 'overall' && overallEntries.length > 0 && (
        <ol className="leaderboard-list">
          {overallEntries.map((e) => (
            <li key={e.account}>
              <span>
                #{e.rank}{' '}
                <span className="wallet-chip">{formatAccount(e.account)}</span>
              </span>
              <strong>
                {e.airdropPoints.toFixed(1)} / {e.airdropCap} pts ·{' '}
                {e.earnedPoints.toLocaleString()} runs
              </strong>
            </li>
          ))}
        </ol>
      )}

      {!loading && !error && period === 'all' && game !== 'overall' && gameEntries.length === 0 && (
        <p className="page-copy">No all-time scores yet for this game.</p>
      )}

      {period === 'all' && game !== 'overall' && gameEntries.length > 0 && (
        <ol className="leaderboard-list">
          {gameEntries.map((e) => (
            <li key={`${e.game}-${e.rank}-${e.account}`}>
              <span>
                #{e.rank}{' '}
                <span className="wallet-chip">{formatAccount(e.account)}</span>
              </span>
              <strong>
                {e.legacyOnly
                  ? `Best ${e.bestScore.toLocaleString()}`
                  : `${e.earnedPoints.toLocaleString()} pts (Best ${e.bestScore.toLocaleString()})`}
              </strong>
            </li>
          ))}
        </ol>
      )}

      <p className="footer-note">
        {embedded ? (
          <>
            Full airdrop breakdown &amp; boards also appear directly below on the
            Falcon Arcade page. Game claims use the same FALCON faucet with
            separate daily game rate limits.
          </>
        ) : (
          <>
            Full boards and airdrop totals live on{' '}
            <a
              href="https://falcon-fpl.com/arcade#leaderboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              Falcon Ledger Arcade
            </a>
            . Game claims use the same FALCON faucet with separate daily game
            rate limits.
          </>
        )}
      </p>
    </section>
  )
}
