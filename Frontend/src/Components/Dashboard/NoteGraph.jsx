import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ForceGraph2D from 'react-force-graph-2d'
import { FaProjectDiagram } from 'react-icons/fa'
import { GetNoteGraph } from '../../Services/operations/Notes.js'
import Loading from '../extra/Loading.jsx'

// small fixed palette sir — the app's theme only defines a handful of accent colors
// (see index.css), cycled by folder name so the same folder always gets the same color
// across a session. "No folder" notes always render in this neutral gray instead.
const FOLDER_PALETTE = ['#ffd60a', '#4bf7b7', '#ffadce', '#7dd3fc', '#c4b5fd', '#fca5a5', '#fdba74']
const NO_FOLDER_COLOR = '#64748b'

const colorForFolder = (folder) => {
    if (!folder) return NO_FOLDER_COLOR
    let hash = 0
    for (let i = 0; i < folder.length; i++) hash = (hash * 31 + folder.charCodeAt(i)) >>> 0
    return FOLDER_PALETTE[hash % FOLDER_PALETTE.length]
}

// notes-as-a-network sir — every note is a node, an edge is drawn between any two notes that
// share at least one tag (same signal Report.jsx's "related notes" panel already uses, just
// visualized across the whole set instead of "top 5 for this one note"). Untagged/unconnected
// notes still render, floating with no edges — a visual nudge that they're not linked into the
// rest of your notes yet, rather than being silently dropped from the graph.
const NoteGraph = () => {
    const navigate = useNavigate()
    const { token } = useSelector((state) => state.auth)
    const [graph, setGraph] = useState(null)
    const [fetching, setFetching] = useState(true)
    const [hoverNode, setHoverNode] = useState(null)
    const fgRef = useRef(null)
    const containerRef = useRef(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

    // ForceGraph2D sizes its <canvas> from explicit width/height props sir — without them it
    // falls back to a default that doesn't match our flex/percentage container, which is why
    // nodes were rendering bunched in a corner instead of spread across the box. ResizeObserver
    // keeps it in sync with the container across window resizes and sidebar collapse/expand.
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect
            setDimensions({ width, height })
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        let cancelled = false
        setFetching(true)
        GetNoteGraph(token).then((data) => {
            if (!cancelled) {
                setGraph(data)
                setFetching(false)
            }
        })
        return () => { cancelled = true }
    }, [token])

    const graphData = useMemo(() => {
        if (!graph) return { nodes: [], links: [] }
        return {
            nodes: graph.nodes.map((n) => ({ ...n, color: colorForFolder(n.folder) })),
            links: graph.edges.map((e) => ({ ...e })),
        }
    }, [graph])

    const isolatedCount = useMemo(() => {
        if (!graph) return 0
        const connected = new Set()
        graph.edges.forEach((e) => { connected.add(e.source); connected.add(e.target) })
        return graph.nodes.filter((n) => !connected.has(n.id)).length
    }, [graph])

    return (
        <div className="px-6 md:px-10 py-10">
            <Helmet><title>Note Graph — Notewise</title></Helmet>

            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="font-display text-2xl font-semibold text-richblack-5 flex items-center gap-2.5">
                        <FaProjectDiagram className="text-yellow-50" size={20} /> Note graph
                    </h1>
                    <p className="text-richblack-400 text-sm mt-1">
                        Notes are linked when they share a tag — thicker lines mean more tags in common. Click a note to open it.
                    </p>
                </div>
                {!fetching && graph && (
                    <p className="text-richblack-400 text-xs font-mono bg-surface-raised border border-border-soft rounded-md px-3 py-1.5">
                        {graph.nodes.length} notes · {graph.edges.length} connections
                        {isolatedCount > 0 && ` · ${isolatedCount} untagged`}
                    </p>
                )}
            </div>

            <div ref={containerRef} className="border border-border-soft rounded-lg bg-surface overflow-hidden" style={{ height: '70vh' }}>
                {fetching ? (
                    <Loading text="Mapping your notes..." />
                ) : !graph?.nodes.length ? (
                    <div className="flex flex-col items-center justify-center text-center py-16 px-8 h-full">
                        <FaProjectDiagram className="text-richblack-400 text-3xl mb-4" />
                        <p className="text-richblack-5 font-semibold mb-1">No notes yet</p>
                        <p className="text-richblack-400 text-sm max-w-sm">
                            Summarize a few notes and tag them to see how they connect here.
                        </p>
                    </div>
                ) : (
                    <ForceGraph2D
                        ref={fgRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={graphData}
                        nodeId="id"
                        nodeLabel={(n) => n.title}
                        nodeColor={(n) => n.color}
                        nodeRelSize={5}
                        linkWidth={(l) => Math.min(l.weight, 5)}
                        linkColor={() => 'rgba(255, 214, 10, 0.25)'}
                        linkLabel={(l) => `Shared: ${l.sharedTags.join(', ')}`}
                        onNodeClick={(n) => navigate(`/Dashboard/Note/${n.id}`)}
                        onNodeHover={setHoverNode}
                        nodeCanvasObjectMode={() => 'after'}
                        nodeCanvasObject={(n, ctx, globalScale) => {
                            if (globalScale < 1.5 && hoverNode?.id !== n.id) return
                            const label = n.title
                            const fontSize = 12 / globalScale
                            ctx.font = `${fontSize}px sans-serif`
                            ctx.textAlign = 'center'
                            ctx.textBaseline = 'top'
                            ctx.fillStyle = 'rgba(255,255,255,0.85)'
                            ctx.fillText(label, n.x, n.y + 8)
                        }}
                        cooldownTicks={100}
                        onEngineStop={() => fgRef.current?.zoomToFit(400, 40)}
                    />
                )}
            </div>
        </div>
    )
}

export default NoteGraph
