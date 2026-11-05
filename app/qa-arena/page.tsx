"use client";
import {useState} from 'react';
import {TournamentForm} from '@/components/kairo/tournament-form';
import type {ExamTemplate} from '@/lib/kairo/types';
const templates:ExamTemplate[]=[{id:'fixture',name:'Riyaziyyat — Kairo məşq sınağı',version:1,year:2026,exam_type:'practice',admission_group:null,grade:11,duration_seconds:1200,max_score:100,scale:'kairo100',official_format:false,source_url:null,source_published:null,verified_at:null,status:'published',sections:[{subject:'Riyaziyyat',count:10,types:['single']}],rules:{}}];
export default function Page(){const [saved,setSaved]=useState('');return <main style={{maxWidth:1100,margin:'40px auto',padding:24}}><h1>Yalnız lokal interfeys yoxlaması</h1><TournamentForm templates={templates} save={async p=>{setSaved(JSON.stringify(p));}}/><output aria-label="Göndərilən vaxtlar">{saved}</output></main>;}

