export const ELEMENTS=[
 ['H','Hidrogen',1,31,[1]],['He','Helium',2,28,[2]],['Li','Litium',3,128,[2,1]],['Be','Berillium',4,96,[2,2]],['B','Bor',5,84,[2,3]],['C','Karbon',6,76,[2,4]],['N','Azot',7,71,[2,5]],['O','Oksigen',8,66,[2,6]],['F','Flüor',9,57,[2,7]],['Ne','Neon',10,58,[2,8]],['Na','Natrium',11,166,[2,8,1]],['Mg','Maqnezium',12,141,[2,8,2]],['Al','Alüminium',13,121,[2,8,3]],['Si','Silisium',14,111,[2,8,4]],['P','Fosfor',15,107,[2,8,5]],['S','Kükürd',16,105,[2,8,6]],['Cl','Xlor',17,102,[2,8,7]],['Ar','Arqon',18,106,[2,8,8]],['K','Kalium',19,203,[2,8,8,1]],['Ca','Kalsium',20,176,[2,8,8,2]]
] as const;
export type AtomKind='H'|'C'|'N'|'O';
export const VALENCE:Record<AtomKind,number>={H:1,C:4,N:3,O:2};
export interface Atom{id:number;kind:AtomKind}
export interface Bond{a:number;b:number;order:number}
export function bondOrder(atoms:Atom[],bonds:Bond[],a:number,b:number,order:number){if(a===b||!atoms.some(x=>x.id===a)||!atoms.some(x=>x.id===b)||![1,2,3].includes(order))return null;const rest=bonds.filter(x=>!((x.a===a&&x.b===b)||(x.a===b&&x.b===a)));for(const id of[a,b]){const used=rest.filter(x=>x.a===id||x.b===id).reduce((n,x)=>n+x.order,0);if(used+order>VALENCE[atoms.find(x=>x.id===id)!.kind])return null;}return [...rest,{a,b,order}];}
export function formula(atoms:Atom[]){const counts=new Map<AtomKind,number>();atoms.forEach(a=>counts.set(a.kind,(counts.get(a.kind)??0)+1));return(['C','H','N','O'] as AtomKind[]).filter(k=>counts.has(k)).map(k=>`${k}${counts.get(k)===1?'':counts.get(k)}`).join('');}
export const REACTIONS=[
 {id:'water',name:'Suyun əmələ gəlməsi',equation:'2H₂ + O₂ → 2H₂O',reactants:[{name:'H₂',coefficient:2},{name:'O₂',coefficient:1}],products:[{name:'H₂O',coefficient:2}],condition:'Alovlanma ilə başlayan ideal tam reaksiya.'},
 {id:'methane',name:'Metanın tam yanması',equation:'CH₄ + 2O₂ → CO₂ + 2H₂O',reactants:[{name:'CH₄',coefficient:1},{name:'O₂',coefficient:2}],products:[{name:'CO₂',coefficient:1},{name:'H₂O',coefficient:2}],condition:'Yetərli oksigendə tam yanma modeli; real kinetika daxil deyil.'},
 {id:'neutral',name:'Neytrallaşma',equation:'HCl + NaOH → NaCl + H₂O',reactants:[{name:'HCl',coefficient:1},{name:'NaOH',coefficient:1}],products:[{name:'NaCl',coefficient:1},{name:'H₂O',coefficient:1}],condition:'Sulu məhlulda güclü turşu və güclü əsas.'},
 {id:'carbonate',name:'Kalsium karbonatın parçalanması',equation:'CaCO₃ → CaO + CO₂',reactants:[{name:'CaCO₃',coefficient:1}],products:[{name:'CaO',coefficient:1},{name:'CO₂',coefficient:1}],condition:'Qızdırılma tələb olunur; tam çevrilmə ideal qəbul edilir.'},
 {id:'iron',name:'Əvəzetmə',equation:'Fe + CuSO₄ → FeSO₄ + Cu',reactants:[{name:'Fe',coefficient:1},{name:'CuSO₄',coefficient:1}],products:[{name:'FeSO₄',coefficient:1},{name:'Cu',coefficient:1}],condition:'Sulu məhlulda dəmirin misi əvəz etməsi.'}
] as const;
export function reactionExtent(coefficients:number[],amounts:number[]){if(coefficients.length!==amounts.length||!coefficients.length||coefficients.some(x=>x<=0)||amounts.some(x=>x<0))throw Error('Reaksiya miqdarı uyğun deyil');const ratios=amounts.map((n,i)=>n/coefficients[i]),extent=Math.min(...ratios);return{extent,remaining:amounts.map((n,i)=>Math.max(0,n-extent*coefficients[i])),limiting:ratios.flatMap((r,i)=>Math.abs(r-extent)<1e-8?[i]:[])};}

