import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface SubjectDef {
  code: string;
  name: string;
  instructor: string;
  credits: number;
  color: string;
  syllabusUnits?: string[];
}

const SUBJECTS: SubjectDef[] = [
  {
    code: 'PYSQ1101',
    name: 'Physics of Semiconductor Devices',
    instructor: 'SS',
    credits: 4,
    color: '#526653',
    syllabusUnits: [
      'Unit 1: Crystal Structure & Energy Band Theory',
      'Unit 2: Carrier Transport & Recombination Phenomena',
      'Unit 3: PN Junction Diodes & Heterojunctions',
      'Unit 4: MOSFET Physics, Short Channel Effects & Scaling',
      'Unit 5: Optoelectronic Devices & Quantum Well Structures',
    ],
  },
  {
    code: 'ECVE1101',
    name: 'VLSI Design',
    instructor: 'SN',
    credits: 4,
    color: '#3B82F6',
    syllabusUnits: [
      'Unit 1: CMOS Inverter Dynamic Analysis & Static Characteristics',
      'Unit 2: Combinational & Sequential MOS Logic Circuits',
      'Unit 3: Interconnect Parasitics & Delay Models',
      'Unit 4: Low-Power Design Techniques & Clock Distribution',
      'Unit 5: Chip Floorplanning, Placement & Routing',
    ],
  },
  {
    code: 'CSQC1101',
    name: 'Introduction to Quantum Computing',
    instructor: 'AR',
    credits: 4,
    color: '#8B5CF6',
    syllabusUnits: [
      'Unit 1: Fundamental Postulates of Quantum Mechanics & Qubits',
      'Unit 2: Quantum Gates, Circuits & Superposition Operations',
      'Unit 3: Quantum Teleportation & Superdense Coding',
      'Unit 4: Quantum Algorithms (Deutsch-Jozsa, Simon, Grover)',
      'Unit 5: Quantum Error Correction & Fault Tolerance',
    ],
  },
  {
    code: 'PYSQ1151',
    name: 'Functional Properties of Materials & Devices',
    instructor: 'JR',
    credits: 3,
    color: '#D97706',
    syllabusUnits: [
      'Unit 1: Dielectric & Ferroelectric Properties of Solids',
      'Unit 2: Magnetic Phenomena & Spintronic Materials',
      'Unit 3: Optical Properties & Photonic Bandgaps',
      'Unit 4: Superconductivity & High-Tc Materials',
      'Unit 5: Smart Functional Nanocomposites & Thin Films',
    ],
  },
  {
    code: 'PYSQ1162',
    name: 'Carbon Nanomaterials',
    instructor: 'FZH',
    credits: 3,
    color: '#10B981',
    syllabusUnits: [
      'Unit 1: Fullerenes, Carbon Nanotubes (SWCNT & MWCNT)',
      'Unit 2: Graphene Synthesis Methods (CVD, Exfoliation)',
      'Unit 3: Electronic & Mechanical Properties of Carbon Nanostructures',
      'Unit 4: Carbon Nanomaterials for Energy Storage (Batteries, Supercapacitors)',
      'Unit 5: Biosensing & Environmental Nanomaterial Applications',
    ],
  },
  {
    code: 'CSQC1104',
    name: 'Quantum Programming Lab',
    instructor: 'AR, AJ',
    credits: 2,
    color: '#6366F1',
    syllabusUnits: [
      'Lab 1: Qiskit & Cirq Simulation Environment Setup',
      'Lab 2: Single and Multi-Qubit Entanglement Bell States',
      'Lab 3: Implementing Grover Search on IBM Quantum Cloud',
      'Lab 4: Quantum Fourier Transform (QFT) Circuit Simulation',
      'Lab 5: Variational Quantum Eigensolver (VQE) Algorithms',
    ],
  },
  {
    code: 'ECVE1105',
    name: 'VLSI Front End Design Lab',
    instructor: 'SN',
    credits: 2,
    color: '#0EA5E9',
    syllabusUnits: [
      'Lab 1: Verilog/SystemVerilog Modeling of Combinational Blocks',
      'Lab 2: FSM Design for Control Units & Sequence Detectors',
      'Lab 3: Static Timing Analysis (STA) with Synopsys/Cadence Tools',
      'Lab 4: RTL Synthesis & Area/Power Optimization Constraints',
      'Lab 5: FPGA Bitstream Generation & Hardware Verification',
    ],
  },
  {
    code: 'PYSQ1106',
    name: 'Seminar-I',
    instructor: 'RK',
    credits: 1,
    color: '#EC4899',
    syllabusUnits: [
      'Phase 1: Literature Survey & Research Paper Selection',
      'Phase 2: Problem Formulation & Technical Slide Preparation',
      'Phase 3: Oral Technical Seminar & Departmental Viva Voce',
    ],
  },
  {
    code: 'PYSQ1107',
    name: 'Minor Project-I (Self Learning)',
    instructor: 'MMM (G4)',
    credits: 2,
    color: '#14B8A6',
    syllabusUnits: [
      'Phase 1: Project Topic Approval & Architecture Specification',
      'Phase 2: Simulation Prototype & Experimental Validation',
      'Phase 3: Interim Progress Report & Code Submission',
    ],
  },
  {
    code: 'HS1101',
    name: 'Communication Skills',
    instructor: 'VM',
    credits: 2,
    color: '#F59E0B',
    syllabusUnits: [
      'Unit 1: Advanced Technical Writing & Research Paper Structure',
      'Unit 2: Academic Presentation & Non-Verbal Rhetoric',
      'Unit 3: Professional Email Etiquette & Technical Documentation',
      'Unit 4: Interpersonal Negotiation & Industry Interview Readiness',
    ],
  },
];

interface TimetableSlotDef {
  dayOfWeek: number; // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri
  startTime: string; // HH:MM:SS
  endTime: string;
  subjectCode: string;
  classroom: string;
}

const TIMETABLE_SLOTS: TimetableSlotDef[] = [
  // MONDAY (1)
  {
    dayOfWeek: 1,
    startTime: '09:00:00',
    endTime: '10:55:00',
    subjectCode: 'PYSQ1107', // Minor Project-I
    classroom: 'G4',
  },
  {
    dayOfWeek: 1,
    startTime: '11:00:00',
    endTime: '12:55:00',
    subjectCode: 'ECVE1105', // VLSI Front End Design Lab
    classroom: 'E210',
  },
  {
    dayOfWeek: 1,
    startTime: '14:30:00',
    endTime: '16:25:00',
    subjectCode: 'CSQC1104', // Quantum Programming Lab
    classroom: 'NTB TA 216',
  },

  // TUESDAY (2)
  {
    dayOfWeek: 2,
    startTime: '11:00:00',
    endTime: '11:55:00',
    subjectCode: 'PYSQ1101', // Physics of Semiconductor Devices
    classroom: 'G4',
  },
  {
    dayOfWeek: 2,
    startTime: '14:30:00',
    endTime: '16:25:00',
    subjectCode: 'ECVE1101', // VLSI Design
    classroom: 'E210',
  },

  // WEDNESDAY (3)
  {
    dayOfWeek: 3,
    startTime: '09:00:00',
    endTime: '09:55:00',
    subjectCode: 'PYSQ1151', // Functional Properties of Materials & Devices
    classroom: 'G4',
  },
  {
    dayOfWeek: 3,
    startTime: '10:00:00',
    endTime: '10:55:00',
    subjectCode: 'PYSQ1162', // Carbon Nanomaterials
    classroom: 'G5',
  },
  {
    dayOfWeek: 3,
    startTime: '11:00:00',
    endTime: '11:55:00',
    subjectCode: 'CSQC1101', // Introduction to Quantum Computing
    classroom: 'NTB TA 111',
  },
  {
    dayOfWeek: 3,
    startTime: '12:00:00',
    endTime: '12:55:00',
    subjectCode: 'PYSQ1101', // Physics of Semiconductor Devices
    classroom: 'G4',
  },
  {
    dayOfWeek: 3,
    startTime: '14:30:00',
    endTime: '16:25:00',
    subjectCode: 'PYSQ1106', // Seminar-I
    classroom: 'G4',
  },
  {
    dayOfWeek: 3,
    startTime: '16:30:00',
    endTime: '17:25:00',
    subjectCode: 'HS1101', // Communication Skills
    classroom: 'MA',
  },

  // THURSDAY (4)
  {
    dayOfWeek: 4,
    startTime: '09:00:00',
    endTime: '09:55:00',
    subjectCode: 'PYSQ1101', // Physics of Semiconductor Devices
    classroom: 'SR',
  },
  {
    dayOfWeek: 4,
    startTime: '10:00:00',
    endTime: '10:55:00',
    subjectCode: 'PYSQ1162', // Carbon Nanomaterials
    classroom: 'G5',
  },
  {
    dayOfWeek: 4,
    startTime: '11:00:00',
    endTime: '11:55:00',
    subjectCode: 'ECVE1101', // VLSI Design
    classroom: 'E210',
  },
  {
    dayOfWeek: 4,
    startTime: '12:00:00',
    endTime: '12:55:00',
    subjectCode: 'PYSQ1151', // Functional Properties of Materials & Devices
    classroom: 'G5',
  },
  {
    dayOfWeek: 4,
    startTime: '14:30:00',
    endTime: '16:25:00',
    subjectCode: 'CSQC1101', // Introduction to Quantum Computing
    classroom: 'NTB TA 111',
  },
  {
    dayOfWeek: 4,
    startTime: '16:30:00',
    endTime: '17:25:00',
    subjectCode: 'HS1101', // Communication Skills
    classroom: 'MA',
  },

  // FRIDAY (5)
  {
    dayOfWeek: 5,
    startTime: '10:00:00',
    endTime: '10:55:00',
    subjectCode: 'PYSQ1151', // Functional Properties of Materials & Devices
    classroom: 'G4',
  },
  {
    dayOfWeek: 5,
    startTime: '11:00:00',
    endTime: '11:55:00',
    subjectCode: 'PYSQ1162', // Carbon Nanomaterials
    classroom: 'SR',
  },
];

async function seed() {
  console.log('--- Starting Timetable & Subject Import ---');

  const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError || !usersData?.users?.length) {
    console.error('Failed to get user:', userError);
    return;
  }

  const user = usersData.users[0];
  console.log(`Target User: ${user.id} (${user.email})`);

  // 1. Upsert Semester
  let semesterId: string | null = null;
  const { data: existingSem } = await supabase
    .from('semesters')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', 'M.Tech (SO) I Semester')
    .maybeSingle();

  if (existingSem) {
    semesterId = existingSem.id;
  } else {
    const { data: newSem } = await supabase
      .from('semesters')
      .insert({
        user_id: user.id,
        name: 'M.Tech (SO) I Semester',
        start_date: '2026-08-01',
        end_date: '2026-12-31',
        is_current: true,
        target_attendance_percentage: 75,
      })
      .select('id')
      .single();
    semesterId = newSem?.id || null;
  }
  console.log(`Semester ID: ${semesterId}`);

  // 2. Insert or update Subjects
  const subjectIdMap = new Map<string, string>();

  for (const s of SUBJECTS) {
    const { data: existingSub } = await supabase
      .from('subjects')
      .select('id')
      .eq('user_id', user.id)
      .eq('code', s.code)
      .maybeSingle();

    let subId = existingSub?.id;

    if (subId) {
      await supabase
        .from('subjects')
        .update({
          name: s.name,
          instructor: s.instructor,
          credits: s.credits,
          color: s.color,
          semester_id: semesterId,
        })
        .eq('id', subId);
      console.log(`Updated subject: ${s.code} - ${s.name}`);
    } else {
      const { data: newSub, error: subErr } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          semester_id: semesterId,
          name: s.name,
          code: s.code,
          instructor: s.instructor,
          credits: s.credits,
          color: s.color,
        })
        .select('id')
        .single();

      if (subErr) {
        console.error(`Error inserting subject ${s.code}:`, subErr);
      } else {
        subId = newSub.id;
        console.log(`Created subject: ${s.code} - ${s.name} (${subId})`);
      }
    }

    if (subId) {
      subjectIdMap.set(s.code, subId);

      // Insert syllabus units if defined
      if (s.syllabusUnits && s.syllabusUnits.length > 0) {
        for (let i = 0; i < s.syllabusUnits.length; i++) {
          const unitTitle = s.syllabusUnits[i];
          const unitNum = i + 1;

          const { data: existingTopic } = await supabase
            .from('syllabus_topics')
            .select('id')
            .eq('subject_id', subId)
            .eq('unit_number', unitNum)
            .maybeSingle();

          if (!existingTopic) {
            await supabase.from('syllabus_topics').insert({
              user_id: user.id,
              subject_id: subId,
              unit_number: unitNum,
              title: unitTitle,
              is_completed: false,
            });
          }
        }
      }
    }
  }

  // 3. Clear old timetable entries and re-insert exact schedule
  console.log('Replacing timetable entries...');
  await supabase.from('timetable_entries').delete().eq('user_id', user.id);

  let insertedCount = 0;
  for (const slot of TIMETABLE_SLOTS) {
    const subId = subjectIdMap.get(slot.subjectCode);
    if (!subId) {
      console.warn(`Subject not found for code: ${slot.subjectCode}`);
      continue;
    }

    const { error: slotErr } = await supabase.from('timetable_entries').insert({
      user_id: user.id,
      subject_id: subId,
      day_of_week: slot.dayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
      classroom: slot.classroom,
    });

    if (slotErr) {
      console.error(`Error inserting slot for ${slot.subjectCode}:`, slotErr);
    } else {
      insertedCount++;
    }
  }

  console.log(`Successfully imported ${insertedCount} timetable lecture slots!`);
  console.log('--- Timetable & Subject Import Complete ---');
}

seed().catch(console.error);
