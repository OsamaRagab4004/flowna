"use client"

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface MindMapListProps {
  onSelectMindMap: (mindMapId: string) => void
}

const mindMaps = [
  {
    id: 'cognitive-psychology',
    title: 'Cognitive Psychology Overview'
  },
  {
    id: 'research-methods',
    title: 'Research Methods Flow'
  },
  {
    id: 'statistical-analysis',
    title: 'Statistical Analysis Tree'
  }
]

export default function MindMapList({ onSelectMindMap }: MindMapListProps) {
  return (
    <div className="space-y-6">
      <div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mindMaps.map((mindMap) => (
              <TableRow 
                key={mindMap.id} 
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => onSelectMindMap(mindMap.id)}
              >
                <TableCell className="font-medium">
                  {mindMap.title}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
