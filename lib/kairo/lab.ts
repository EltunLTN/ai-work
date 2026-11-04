export type LabPoint={x:number;y:number};
export function triangleArea(points:LabPoint[]){const [a,b,c]=points;return Math.abs(a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y))/2;}
export function motion(force:number,mass:number,seconds:number){if(mass<=0)throw new Error("Kütlə müsbət olmalıdır");return {acceleration:force/mass,velocity:force/mass*seconds,distance:0.5*force/mass*seconds**2};}

