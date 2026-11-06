'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  FolderArchive,
  FileCheck,
  Plus,
  Lock,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Database } from '@/types/database';

type DocumentRow = Database['public']['Tables']['documents']['Row'];

interface DocumentsViewProps {
  documents: DocumentRow[];
}

export function DocumentsView({ documents }: DocumentsViewProps) {
  const [filter, setFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<
    'academic' | 'identity' | 'travel' | 'financial' | 'medical' | 'general'
  >('academic');
  const [notes, setNotes] = useState('');

  const filteredDocs =
    filter === 'all'
      ? documents
      : documents.filter((d) => d.category === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderArchive className="h-5 w-5 text-emerald-500" />
            Document Storage Vault
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Encrypted private file repository for academic certificates, travel passes, and records.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shadow-xs">
            <Plus className="h-3.5 w-3.5" />
            Upload Document
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Secure Document Upload</DialogTitle>
              <DialogDescription className="text-xs">
                Files are isolated in your private Supabase Storage bucket with strict RLS permissions.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="doc-name" className="text-xs">Document Name *</Label>
                <Input
                  id="doc-name"
                  required
                  placeholder="e.g. Semester 4 Marksheet.pdf"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-cat" className="text-xs">Vault Category</Label>
                <select
                  id="doc-cat"
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value as
                        | 'academic'
                        | 'identity'
                        | 'travel'
                        | 'financial'
                        | 'medical'
                        | 'general'
                    )
                  }
                  className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none"
                >
                  <option value="academic">Academic Certificates & Transcripts</option>
                  <option value="identity">Identity & Official Passports</option>
                  <option value="travel">Travel Passes & Boarding Tickets</option>
                  <option value="financial">Financial Statements & Invoices</option>
                  <option value="medical">Medical & Health Prescriptions</option>
                  <option value="general">General Documentation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-file" className="text-xs">Choose File</Label>
                <Input id="doc-file" type="file" className="text-xs h-9 cursor-pointer" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-notes" className="text-xs">Notes / Tags</Label>
                <Input
                  id="doc-notes"
                  placeholder="Optional reference notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Upload File
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Security Banner */}
      <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Lock className="h-4 w-4 shrink-0" />
          <span>Storage Isolation Active: Access restricted to authenticated user token.</span>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30">
          AES-256 Cloud Encrypted
        </Badge>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {['all', 'academic', 'identity', 'travel', 'financial', 'general'].map((tab) => (
          <Button
            key={tab}
            variant={filter === tab ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs capitalize"
            onClick={() => setFilter(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground">
          <FolderArchive className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p>No documents found in this vault category.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="hover:border-primary/40 transition-colors flex flex-col justify-between"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <CardTitle className="text-sm font-semibold truncate">
                        {doc.name}
                      </CardTitle>
                      <CardDescription className="text-[10px] mt-0.5">
                        {format(new Date(doc.created_at), 'MMM d, yyyy')} &bull;{' '}
                        {Math.round(doc.file_size_bytes / 1024)} KB
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {doc.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex items-center justify-between text-xs border-t border-border/40 mt-3">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {doc.mime_type}
                </span>
                <Button variant="ghost" size="xs" className="h-6 text-[10px] gap-1">
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
