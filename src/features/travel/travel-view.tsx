'use client';

import React, { useState, useTransition } from 'react';
import { format } from 'date-fns';
import {
  Plane,
  Train,
  Bus,
  Car,
  Compass,
  Plus,
  Trash2,
  Calendar,
  Ticket,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createJourneyAction,
  deleteJourneyAction,
} from '@/features/personal-life/actions';
import type { Database } from '@/types/database';

type JourneyRow = Database['public']['Tables']['journeys']['Row'];

interface TravelViewProps {
  journeys: JourneyRow[];
}

export function TravelView({ journeys }: TravelViewProps) {
  const [now] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [transportType, setTransportType] = useState<
    'train' | 'flight' | 'bus' | 'car' | 'other'
  >('train');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 16);
  });
  const [arrivalTime, setArrivalTime] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateJourney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !origin.trim() || !destination.trim()) {
      setError('Title, origin, and destination are required.');
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await createJourneyAction({
        title,
        transportType,
        origin,
        destination,
        departureTime: new Date(departureTime).toISOString(),
        arrivalTime: arrivalTime ? new Date(arrivalTime).toISOString() : null,
        bookingReference: bookingRef || null,
        carrierName: carrierName || null,
        seatNumber: seatNumber || null,
        status: 'confirmed',
        notes: notes || null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setTitle('');
        setOrigin('');
        setDestination('');
        setBookingRef('');
        setCarrierName('');
        setSeatNumber('');
        setNotes('');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteJourneyAction(id);
    });
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane className="h-4 w-4 text-primary" />;
      case 'train':
        return <Train className="h-4 w-4 text-primary" />;
      case 'bus':
        return <Bus className="h-4 w-4 text-primary" />;
      default:
        return <Car className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          Travel &amp; Tickets
        </h2>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shadow-xs transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Journey
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">Add Travel Itinerary</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateJourney} className="space-y-4 pt-2">
              {error && (
                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="j-title" className="text-xs">Trip Name *</Label>
                  <Input
                    id="j-title"
                    required
                    placeholder="e.g. Semester Break Trip Home"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="j-type" className="text-xs">Mode</Label>
                  <select
                    id="j-type"
                    value={transportType}
                    onChange={(e) =>
                      setTransportType(
                        e.target.value as 'train' | 'flight' | 'bus' | 'car' | 'other'
                      )
                    }
                    className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs outline-none cursor-pointer"
                  >
                    <option value="train">Train</option>
                    <option value="flight">Flight</option>
                    <option value="bus">Bus</option>
                    <option value="car">Car</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="j-origin" className="text-xs">Origin Station / City *</Label>
                  <Input
                    id="j-origin"
                    required
                    placeholder="e.g. New Delhi (NDLS)"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="j-dest" className="text-xs">Destination *</Label>
                  <Input
                    id="j-dest"
                    required
                    placeholder="e.g. Mumbai Central (MMCT)"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="j-dep" className="text-xs">Departure Date & Time *</Label>
                  <Input
                    id="j-dep"
                    type="datetime-local"
                    required
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="j-arr" className="text-xs">Arrival (Optional)</Label>
                  <Input
                    id="j-arr"
                    type="datetime-local"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="j-pnr" className="text-xs">PNR / Ref #</Label>
                  <Input
                    id="j-pnr"
                    placeholder="e.g. 245-8941235"
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value)}
                    className="h-8 text-xs font-mono rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="j-carrier" className="text-xs">Carrier</Label>
                  <Input
                    id="j-carrier"
                    placeholder="e.g. Rajdhani Express"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="j-seat" className="text-xs">Seat / Berth</Label>
                  <Input
                    id="j-seat"
                    placeholder="e.g. B4 - 32"
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    className="h-8 text-xs font-mono rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="j-notes" className="text-xs">Notes / Packing Items</Label>
                <Input
                  id="j-notes"
                  placeholder="Optional packing memo or hotel details"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-8 text-xs rounded-lg border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !title.trim()}
                  className="h-8 text-xs rounded-lg shadow-xs"
                >
                  {isPending ? 'Saving...' : 'Save Journey'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Journeys List */}
      {journeys.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground border-border bg-card rounded-xl shadow-xs">
          <Compass className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p>No travel itineraries added yet. Click &ldquo;Add Journey&rdquo; to log your trips.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="mt-4 text-xs h-8 rounded-lg border-border"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add First Journey
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {journeys.map((trip) => {
            const depDate = new Date(trip.departure_time);
            const isPast = depDate.getTime() < now;

            return (
              <Card
                key={trip.id}
                className={`border-border bg-card rounded-xl shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between ${
                  isPast ? 'opacity-70 bg-muted/20' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-muted border border-border">
                        {getTransportIcon(trip.transport_type)}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold truncate text-foreground">
                          {trip.title}
                        </CardTitle>
                        {trip.carrier_name && (
                          <CardDescription className="text-[11px] text-muted-foreground">
                            {trip.carrier_name}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={isPast ? 'secondary' : 'outline'}
                        className="text-[10px] capitalize font-mono border-border"
                      >
                        {trip.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(trip.id)}
                        disabled={isPending}
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        aria-label="Delete journey"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">From</span>
                      <span className="font-semibold text-foreground">{trip.origin}</span>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">To</span>
                      <span className="font-semibold text-foreground">{trip.destination}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span className="font-mono">{format(depDate, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span className="font-mono">{format(depDate, 'hh:mm a')}</span>
                    </div>
                  </div>

                  {(trip.seat_number || trip.booking_reference) && (
                    <div className="text-[11px] font-mono text-muted-foreground border-t border-border pt-2 flex items-center justify-between">
                      {trip.booking_reference ? (
                        <span>Ref: {trip.booking_reference}</span>
                      ) : (
                        <span />
                      )}
                      {trip.seat_number && (
                        <div className="flex items-center gap-1 font-semibold text-foreground">
                          <Ticket className="h-3.5 w-3.5 text-primary" />
                          <span>Seat: {trip.seat_number}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {trip.notes && (
                    <p className="text-[11px] text-muted-foreground italic border-t border-border/50 pt-1.5 line-clamp-1">
                      {trip.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
