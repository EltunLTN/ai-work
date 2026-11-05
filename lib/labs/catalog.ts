export const LABS=[
 ['function','Riyaziyyat','Funksiya meydançası','Function Playground','Əmsalları dəyiş, qrafiki müqayisə et.'],
 ['geometry','Riyaziyyat','Həndəsə studiyası','Geometry Studio','Təpələri hərəkət etdir, bucaq və sahəni ölç.'],
 ['probability','Riyaziyyat','Ehtimal laboratoriyası','Probability Lab','Minlərlə zər və sikkə atışını nəzəri ehtimalla müqayisə et.'],
 ['trigonometry','Riyaziyyat','Vahid çevrə','Trigonometry Circle','Bucağı dəyiş, sin, cos və tanı canlı gör.'],
 ['circuit','Fizika','Elektrik dövrəsi qur','Circuit Builder','Batareya, rezistor və lampaları ardıcıl və paralel qoş.'],
 ['motion','Fizika','Hərəkət simulyatoru','Motion Simulator','Sürət, qüvvə, kütlə və sürtünməni sına.'],
 ['optics','Fizika','Optika laboratoriyası','Optics Lab','Linzalar, güzgülər, əksolunma və sınma.'],
 ['pendulum','Fizika','Rəqqas laboratoriyası','Pendulum Lab','Uzunluq və cazibəni dəyiş, periodu ölç.'],
 ['molecule','Kimya','Molekul qur','Molecule Builder','Atom əlavə et və rabitələrlə birləşdir.'],
 ['reaction','Kimya','Reaksiya simulyatoru','Reaction Simulator','Maddə miqdarı, tarazlaşdırılmış tənlik və məhsul.'],
 ['periodic','Kimya','Elementləri araşdır','Periodic Table Explorer','Elektron qatları və kovalent radiusları müqayisə et.'],
 ['ph','Kimya','pH laboratoriyası','pH Lab','Qatılıq və durulaşdırmanın pH-a təsirini gör.'],
 ['body','Biologiya','İnsan bədəni 3D','Human Body 3D','Modeli fırlat, orqanları və funksiyalarını seç.'],
 ['genetics','Biologiya','Genetika laboratoriyası','Genetics Lab','Genotiplərdən nəsil ehtimallarını hesabla.'],
 ['cell','Biologiya','Hüceyrəni araşdır','Cell Explorer','Bitki və heyvan hüceyrələrini müqayisə et.'],
 ['earth','Coğrafiya','Yer kürəsi 3D','Earth Explorer','Enlik və uzunluğu fırlanan kürədə tap.'],
 ['climate','Coğrafiya','İqlim simulyatoru','Climate Simulator','Temperatur, yağıntı və fəsillərlə iqlim qrafiki qur.'],
 ['tectonics','Coğrafiya','Litosfer tavaları','Tectonic Plates','Sərhədlərdə dağ, rift və sürüşmə modellərini izlə.'],
 ['algorithm','İnformatika','Alqoritmləri izlə','Algorithm Visualizer','Sıralama və axtarışı addım-addım işlə.'],
 ['logic','İnformatika','Məntiqi sxem qur','Logic Gate Builder','Qapıları birləşdir və doğruluq cədvəlini yoxla.']
] as const;
export type LabId=typeof LABS[number][0];

