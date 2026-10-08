import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { fetchGraph } from '../services/api'
import type { GraphData } from '../types'
import { getZoneTypeColor } from '../utils/formatters'
import { AlertTriangle, Info, RefreshCw } from 'lucide-react'

// Zone layout positions
const ZONE_POSITIONS: Record<string, { x: number; y: number }> = {
  Internet:    { x: 300, y: 20 },
  DMZ:         { x: 300, y: 140 },
  Application: { x: 300, y: 260 },
  Database:    { x: 300, y: 380 },
  Admin:       { x: 600, y: 260 },
  Guest:       { x: 0,   y: 260 },
}

function buildNodes(data: GraphData, highlightPath: string[]): Node[] {
  return data.nodes.map((n, i) => {
    const pos = ZONE_POSITIONS[n.id] ?? { x: (i % 4) * 200, y: Math.floor(i / 4) * 150 }
    const color = getZoneTypeColor(n.zone_type)
    const isHighlighted = highlightPath.includes(n.id)
    return {
      id: n.id,
      position: pos,
      data: {
        label: (
          <div className="px-2 py-1 text-center">
            <div className="font-semibold text-sm">{n.id}</div>
            <div className="text-xs opacity-70">{n.zone_type}</div>
            <div className="text-xs opacity-50 font-mono">{n.cidr}</div>
          </div>
        ),
      },
      style: {
        background: isHighlighted ? `${color}30` : '#1a1f2e',
        border: `2px solid ${isHighlighted ? color : color + '60'}`,
        borderRadius: '10px',
        color: color,
        minWidth: 140,
        boxShadow: isHighlighted ? `0 0 20px ${color}40` : 'none',
      },
    }
  })
}

function buildEdges(data: GraphData, highlightPath: string[]): Edge[] {
  const edgeMap = new Map<string, Edge>()

  // Helper to check if this edge is in the highlighted path
  const isInPath = (src: string, tgt: string) => {
    for (let i = 0; i < highlightPath.length - 1; i++) {
      if (highlightPath[i] === src && highlightPath[i + 1] === tgt) return true
    }
    return false
  }

  for (const e of data.edges) {
    const key = `${e.source}-${e.target}-${e.action}`
    if (edgeMap.has(key)) continue

    const isAllow = e.action === 'ALLOW'
    const inPath = isInPath(e.source, e.target)
    const color = inPath ? '#ef4444' : isAllow ? '#10b981' : '#ef444460'

    edgeMap.set(key, {
      id: key,
      source: e.source,
      target: e.target,
      label: `${e.action} / ${e.protocol}:${e.dst_port}`,
      animated: inPath,
      style: {
        stroke: color,
        strokeWidth: inPath ? 3 : 2,
        strokeDasharray: isAllow ? 'none' : '6,3',
      },
      labelStyle: { fill: color, fontSize: 10, fontWeight: inPath ? 700 : 400 },
      labelBgStyle: { fill: '#1a1f2e', fillOpacity: 0.9 },
      markerEnd: isAllow ? {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      } : undefined,
      type: 'smoothstep',
    })
  }
  return Array.from(edgeMap.values())
}

export default function NetworkTopology() {
  const { data: graphData, isLoading, refetch } = useQuery({
    queryKey: ['graph'],
    queryFn: fetchGraph,
  })

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null)
  const [highlightPath, setHighlightPath] = useState<string[]>([])
  const [selectedInfo, setSelectedInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!graphData) return
    const vpath = selectedViolation
      ? (graphData.violation_paths.find((p) => p.id === selectedViolation)?.path ?? [])
      : []
    setHighlightPath(vpath)
    setNodes(buildNodes(graphData, vpath))
    setEdges(buildEdges(graphData, vpath))
  }, [graphData, selectedViolation])

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    const zone = graphData?.nodes.find((n) => n.id === node.id)
    if (zone) {
      setSelectedInfo(
        `Zone: ${zone.id}\nType: ${zone.zone_type}\nTrust Level: ${zone.trust_level}\nCIDR: ${zone.cidr}`
      )
    }
  }, [graphData])

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    setSelectedInfo(`Edge: ${edge.source} -> ${edge.target}\n${String(edge.label ?? '')}`)
  }, [])

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Network Topology</h1>
          <p className="text-sm text-slate-400">Interactive graph — drag nodes, click to inspect</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Graph */}
        <div className="flex-1 card overflow-hidden" style={{ height: 580 }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              Loading graph...
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              fitView
              attributionPosition="bottom-left"
            >
              <Background color="#2d3748" gap={24} size={1} />
              <Controls
                style={{ background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 8 }}
              />
              <MiniMap
                style={{ background: '#0e121c', border: '1px solid #2d3748' }}
                nodeColor={(n) => getZoneTypeColor(n.style?.border?.toString().slice(13, 20) ?? '')}
                maskColor="#0e121c80"
              />
              <Panel position="top-left">
                <div className="flex gap-3 p-2 bg-[#1a1f2e]/90 backdrop-blur border border-[#2d3748] rounded-lg text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 bg-green-500" />
                    <span className="text-slate-400">ALLOW</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 bg-red-600" style={{ borderTop: '2px dashed' }} />
                    <span className="text-slate-400">DENY</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 bg-red-400 animate-pulse" />
                    <span className="text-slate-400">Violation Path</span>
                  </div>
                </div>
              </Panel>
            </ReactFlow>
          )}
        </div>

        {/* Right panel */}
        <div className="w-64 flex flex-col gap-4">
          {/* Violation paths */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Violation Paths
            </h3>
            {graphData?.violation_paths && graphData.violation_paths.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {graphData.violation_paths.map((vp) => (
                  <button
                    key={vp.id}
                    onClick={() => {
                      setSelectedViolation(selectedViolation === vp.id ? null : vp.id)
                    }}
                    className={`w-full text-left p-2 rounded-md border text-xs transition-colors ${
                      selectedViolation === vp.id
                        ? 'bg-red-900/30 border-red-700/50 text-red-300'
                        : 'bg-[#161b28] border-[#2d3748] text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-medium mb-1">{vp.id} — {vp.severity}</div>
                    <div className="opacity-70">{vp.path.join(' → ')}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 text-center py-4">
                Run validation to see violation paths
              </div>
            )}
          </div>

          {/* Selected node info */}
          {selectedInfo && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Selected Element
              </h3>
              <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono">{selectedInfo}</pre>
            </div>
          )}

          {/* Legend */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Zone Types</h3>
            <div className="space-y-1.5">
              {[
                ['External', '#ef4444'],
                ['DMZ', '#f97316'],
                ['Internal', '#3b82f6'],
                ['Restricted', '#8b5cf6'],
                ['Management', '#eab308'],
                ['Guest', '#6b7280'],
              ].map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-3 h-3 rounded-sm" style={{ background: color + '40', border: `2px solid ${color}` }} />
                  {type}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
