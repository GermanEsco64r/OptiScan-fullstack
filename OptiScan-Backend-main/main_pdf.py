import cv2
import numpy as np
import matplotlib.pyplot as plt
from scipy.spatial import distance
import mediapipe as mp
import os
import json
import sys
import base64

# Configurar la codificación para Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

class AnalizadorFormaRostroPDF:
    def __init__(self):
        # Inicializar MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        print(">>> MediaPipe Face Mesh inicializado exitosamente")
    
    def cargar_imagen(self, ruta_imagen):
        """Cargar y preparar imagen"""
        print(f">>> Cargando imagen desde: {ruta_imagen}")
        
        # Verificar si el archivo existe
        if not os.path.exists(ruta_imagen):
            print(f"ERROR: El archivo {ruta_imagen} no existe")
            return None, None
        
        imagen = cv2.imread(ruta_imagen)
        if imagen is None:
            print("ERROR: No se pudo cargar la imagen con OpenCV")
            return None, None
        
        print(f">>> Imagen cargada - Dimensiones: {imagen.shape}")
        
        # Voltear para vista natural (espejo)
        imagen = cv2.flip(imagen, 1)
        imagen_rgb = cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)
        return imagen, imagen_rgb
    
    def detectar_puntos_faciales(self, imagen_rgb):
        """Detectar puntos faciales con MediaPipe"""
        resultados = self.face_mesh.process(imagen_rgb)
        
        if not resultados.multi_face_landmarks:
            return None
        
        # Obtener el primer rostro detectado
        landmarks = resultados.multi_face_landmarks[0]
        
        # Convertir puntos a coordenadas de píxeles
        h, w, _ = imagen_rgb.shape
        puntos = []
        
        for landmark in landmarks.landmark:
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            puntos.append((x, y))
        
        return np.array(puntos)
    
    def mapear_puntos_mediapipe(self, puntos, imagen_shape):
        """Mapear puntos de MediaPipe a nombres descriptivos"""
        h, w = imagen_shape[:2]
        
        # Índices de MediaPipe Face Mesh
        return {
            'barbilla': tuple(puntos[152]),
            'frente_centro': tuple(puntos[10]),
            'frente_izquierda': tuple(puntos[109]),
            'frente_derecha': tuple(puntos[338]),
            'sien_izquierda': tuple(puntos[162]),
            'sien_derecha': tuple(puntos[389]),
            'mandibula_izquierda': tuple(puntos[172]),
            'mandibula_derecha': tuple(puntos[397]),
            'pomulo_izquierdo': tuple(puntos[116]),
            'pomulo_derecho': tuple(puntos[345]),
            'pomulo_izquierdo_ext': tuple(puntos[50]),
            'pomulo_derecho_ext': tuple(puntos[280]),
            'ojo_izquierdo_centro': tuple(puntos[468]),
            'ojo_derecho_centro': tuple(puntos[473]),
            'nariz_punta': tuple(puntos[1]),
            'nariz_raiz': tuple(puntos[168]),  # PUNTO CLAVE: Raíz de la nariz (comienzo)
            'ceja_izquierda_medio': tuple(puntos[107]),
            'ceja_derecha_medio': tuple(puntos[336]),
            'boca_izquierda_esquina': tuple(puntos[61]),
            'boca_derecha_esquina': tuple(puntos[291]),
            'labio_superior_medio': tuple(puntos[0]),
            'labio_inferior_medio': tuple(puntos[17]),
            # Puntos del iris (centro de las pupilas)
            'iris_izquierdo': tuple(puntos[468]),  # Centro del iris izquierdo
            'iris_derecho': tuple(puntos[473]),    # Centro del iris derecho
        }
    
    def calcular_contorno_rostro(self, puntos):
        """Calcular el contorno del rostro usando puntos clave"""
        contorno_indices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 
                          361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 
                          176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 
                          162, 21, 54, 103, 67, 109]
        
        valid_indices = [i for i in contorno_indices if i < len(puntos)]
        contorno = [tuple(puntos[i]) for i in valid_indices]
        return np.array(contorno)
    
    def calcular_medidas_faciales(self, puntos_referencia, puntos_array):
        """Calcular las medidas faciales clave"""
        # A: Largo del rostro
        A = distance.euclidean(puntos_referencia['frente_centro'], puntos_referencia['barbilla'])
        
        # B: Ancho de los pómulos
        B = distance.euclidean(puntos_referencia['pomulo_izquierdo_ext'], puntos_referencia['pomulo_derecho_ext'])
        
        # C: Ancho de la frente
        C = distance.euclidean(puntos_referencia['frente_izquierda'], puntos_referencia['frente_derecha'])
        
        # D: Ancho de la mandíbula
        D = distance.euclidean(puntos_referencia['mandibula_izquierda'], puntos_referencia['mandibula_derecha'])
        
        # E: Ancho entre sienes
        E = distance.euclidean(puntos_referencia['sien_izquierda'], puntos_referencia['sien_derecha'])
        
        # F: Distancia entre ojos
        F = distance.euclidean(puntos_referencia['ojo_izquierdo_centro'], puntos_referencia['ojo_derecho_centro'])
        
        # AGREGAR DISTANCIAS NASOPUPILARES (DNP) - CORREGIDAS
        # Distancia de la raíz de la nariz al iris izquierdo (DNP_I)
        DNP_I = distance.euclidean(puntos_referencia['nariz_raiz'], puntos_referencia['iris_izquierdo'])
        
        # Distancia de la raíz de la nariz al iris derecho (DNP_D)
        DNP_D = distance.euclidean(puntos_referencia['nariz_raiz'], puntos_referencia['iris_derecho'])
        
        # Distancia interpupilar (DIP) - suma de DNP_I + DNP_D
        DIP = DNP_I + DNP_D
        
        # Verificación: DNP_I + DNP_D debe ser aproximadamente igual a DIP
        diferencia_DIP = abs(DIP - F)
        
        # Calcular proporciones clave
        R_AA = A / B if B != 0 else 0
        R_BC = B / C if C != 0 else 0
        R_BD = B / D if D != 0 else 0
        R_CD = C / D if D != 0 else 0
        R_AE = A / E if E != 0 else 0
        
        # Calcular ángulos de la mandíbula
        angulo_izq, angulo_der = self.calcular_angulo_mandibula_mejorado(puntos_referencia)
        angulo_mandibula_promedio = (angulo_izq + angulo_der) / 2
        
        # Calcular curvatura del contorno
        curvatura = self.calcular_curvatura_contorno(puntos_array)
        
        # Convertir a tipos nativos de Python para JSON
        return {
            # Medidas lineales básicas
            'A': float(A), 'B': float(B), 'C': float(C), 'D': float(D), 'E': float(E), 'F': float(F),
            
            # MEDIDAS PUPILARES PARA GAFAS - AGREGADAS
            'DNP_I': float(DNP_I),      # Distancia NasoPupilar Izquierda
            'DNP_D': float(DNP_D),      # Distancia NasoPupilar Derecha  
            'DIP': float(DIP),          # Distancia InterPupilar (suma)
            'diferencia_DIP': float(diferencia_DIP),  # Diferencia entre métodos
            
            # Proporciones faciales
            'R_AA': float(R_AA), 'R_BC': float(R_BC), 'R_BD': float(R_BD), 'R_CD': float(R_CD), 'R_AE': float(R_AE),
            'angulo_mandibula': float(angulo_mandibula_promedio),
            'curvatura': float(curvatura)
        }
        
    def analizar_distancias_pupilares(self, puntos_referencia):
        """Análisis específico de distancias pupilares para gafas"""
        DNP_I = distance.euclidean(puntos_referencia['nariz_raiz'], puntos_referencia['iris_izquierdo'])
        DNP_D = distance.euclidean(puntos_referencia['nariz_raiz'], puntos_referencia['iris_derecho'])
        DIP = DNP_I + DNP_D
        
        # Calcular asimetría (diferencia entre ambos lados)
        asimetria = abs(DNP_I - DNP_D)
        
        # Evaluar la simetría
        if asimetria < 5:  # Menos de 5 píxeles de diferencia
            simetria = "Excelente simetría"
        elif asimetria < 10:
            simetria = "Buena simetría" 
        elif asimetria < 15:
            simetria = "Simetría moderada"
        else:
            simetria = "Asimetría significativa - requiere verificación manual"
        
        return {
            'DNP_I': float(DNP_I),
            'DNP_D': float(DNP_D), 
            'DIP': float(DIP),
            'asimetria_px': float(asimetria),
            'eval_simetria': simetria,
            'notas': 'DNP_I + DNP_D = DIP. Valores en píxeles. Para mm, aplicar factor de conversión.'
        }
    
    def calcular_angulo_mandibula_mejorado(self, puntos):
        """Calcular ángulo de la mandíbula con mayor precisión"""
        def calcular_angulo(a, b, c):
            """Calcular ángulo entre tres puntos"""
            ba = np.array(a) - np.array(b)
            bc = np.array(c) - np.array(b)
            
            cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
            angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
            return float(np.degrees(angle))  # <-- CONVERTIR A float
        
        # Ángulo izquierdo
        angulo_izq = calcular_angulo(
            puntos['pomulo_izquierdo'], 
            puntos['mandibula_izquierda'], 
            puntos['barbilla']
        )
        
        # Ángulo derecho
        angulo_der = calcular_angulo(
            puntos['pomulo_derecho'], 
            puntos['mandibula_derecha'], 
            puntos['barbilla']
        )
        
        return angulo_izq, angulo_der
    
    def calcular_curvatura_contorno(self, puntos_array):
        """Calcular la curvatura del contorno facial"""
        contorno = self.calcular_contorno_rostro(puntos_array)
        
        if len(contorno) < 3:
            return 0.0
        
        centro = np.mean(contorno, axis=0)
        distancias = [distance.euclidean(p, centro) for p in contorno]
        curvatura = np.std(distancias) if distancias else 0.0
        
        return float(curvatura)
    
    def determinar_forma_rostro_avanzada(self, medidas, caracteristicas_contorno):
        """Determinar forma del rostro con algoritmo avanzado"""
        R_AA = medidas['R_AA']
        R_BC = medidas['R_BC']
        R_BD = medidas['R_BD']
        R_CD = medidas['R_CD']
        angulo = medidas['angulo_mandibula']
        curvatura = medidas['curvatura']
        
        # CUADRADO - PARÁMETROS BASADOS EN TUS IMÁGENES CORRECTAS
        if ((1.60 <= R_AA <= 1.80) and
            (2.5 <= R_BC <= 2.7) and
            (0.85 <= R_BD <= 0.90) and
            (122 <= angulo <= 128) and
            (6.0 <= curvatura <= 20.0)):
            return "Cuadrado", "Rostro con estructura angular y mandibula definida"
        
        # DIAMANTE
        if ((1.55 <= R_AA <= 1.75) and
            (2.3 <= R_BC <= 2.5) and
            (0.88 <= R_BD <= 0.93) and
            (135 <= angulo <= 140) and
            (4.0 <= curvatura <= 15.0)):
            return "Diamante", "Rostro con pomulos anchos y estructura angular"
        
        # OVALADO
        if ((1.5 <= R_AA <= 1.8) and
            (2.0 <= R_BC <= 2.6) and
            (0.90 <= R_BD <= 1.05) and
            (128 <= angulo <= 135) and
            (curvatura <= 12.0)):
            return "Ovalado", "Rostro con proporciones equilibradas y contornos suaves"
        
        # OBLONGO
        if R_AA >= 1.80:
            if not (0.88 <= R_BD <= 0.93 and 135 <= angulo <= 140):
                if R_AA >= 1.85 and R_BD <= 0.85:
                    return "Oblongo", "Rostro muy alargado"
                elif (2.3 <= R_BC <= 2.8 and 0.80 <= R_BD <= 0.85 and 125 <= angulo <= 140):
                    return "Oblongo", "Rostro alargado con estructura definida"
        
        # REDONDO
        if ((1.5 <= R_AA <= 1.7) and 
            (2.4 <= R_BC <= 2.8) and 
            (0.85 <= R_BD <= 0.92) and 
            (122 <= angulo <= 128) and 
            (curvatura >= 3.8)):
            return "Redondo", "Rostro con contornos curvos y proporciones balanceadas"
        
        # Clasificación por defecto
        if (0.85 <= R_BD <= 0.90) and (122 <= angulo <= 128):
            return "Cuadrado", "Rostro cuadrado (estructura angular)"
        elif (0.88 <= R_BD <= 0.93) and (135 <= angulo <= 140):
            return "Diamante", "Rostro diamante (pomulos prominentes)"
        elif (0.90 <= R_BD <= 1.05) and (128 <= angulo <= 135):
            return "Ovalado", "Rostro ovalado (proporciones balanceadas)"
        elif R_AA >= 1.80 and R_BD <= 0.85:
            return "Oblongo", "Rostro oblongo"
        elif R_AA < 1.2:
            return "Redondo", "Rostro redondeado"
        else:
            return "Ovalado", "Rostro con proporciones equilibradas"

    def obtener_rectangulo_rostro(self, puntos_referencia):
        """Obtener rectángulo del rostro basado en puntos clave"""
        todos_puntos = list(puntos_referencia.values())
        xs = [p[0] for p in todos_puntos]
        ys = [p[1] for p in todos_puntos]
        
        x = min(xs)
        y = min(ys)
        w = max(xs) - x
        h = max(ys) - y
        
        expand = 20
        x = max(0, x - expand)
        y = max(0, y - expand)
        w = min(w + 2*expand, 1000)
        h = min(h + 2*expand, 1000)
        
        return (x, y, w, h)
    
    def cargar_imagenes_base64(self):
        """Cargar imágenes usando las rutas REALES de tu código"""
        try:
            print("🖼️ Cargando imágenes REALES como base64...")
            
            # Mapeo EXACTO según tu código
            formas_imagenes = {
                "Cuadrado": [
                    "venv/marcos/rectangularc.jpg",
                    "venv/marcos/aviador.jpg"
                ],
                "Ovalado": [
                    "venv/marcos/redondoc.png", 
                    "venv/marcos/rectangulars.jpg"
                ],
                "Redondo": [
                    "venv/marcos/rectangulara.png",
                    "venv/marcos/mariposa.jpg"
                ],
                "Diamante": [
                    "venv/marcos/ovalados.png",
                    "venv/marcos/rectangulare.jpg"
                ],
                "Oblongo": [
                    "venv/marcos/cuadradoa.png",
                    "venv/marcos/monturas.png"
                ]
            }
            
            imagenes_base64 = {}
            
            for forma, rutas in formas_imagenes.items():
                imagenes_base64[forma] = []
                for ruta_imagen in rutas:
                    if os.path.exists(ruta_imagen):
                        try:
                            with open(ruta_imagen, "rb") as image_file:
                                image_data = base64.b64encode(image_file.read()).decode('utf-8')
                                
                            # Determinar el tipo MIME basado en la extensión
                            if ruta_imagen.lower().endswith('.png'):
                                mime_type = 'image/png'
                            else:
                                mime_type = 'image/jpeg'
                                
                            base64_string = f"data:{mime_type};base64,{image_data}"
                            imagenes_base64[forma].append(base64_string)
                            print(f"✅ {forma} - {ruta_imagen}: Cargado ({len(base64_string)} chars)")
                            
                        except Exception as e:
                            print(f"❌ {forma} - {ruta_imagen}: Error al convertir: {e}")
                            imagenes_base64[forma].append(None)
                    else:
                        print(f"⚠️ {forma} - {ruta_imagen}: NO EXISTE")
                        imagenes_base64[forma].append(None)
            
            return imagenes_base64
            
        except Exception as e:
            print(f"❌ Error cargando imágenes base64: {e}")
            return {}

    def generar_recomendaciones_completas(self, forma_rostro):
        """Generar recomendaciones con las rutas REALES"""
        
        print(f"🎯 Generando recomendaciones para: {forma_rostro}")
        
        # Mapeo de nombres de archivo para URLs (para el frontend)
        nombres_archivos = {
            "Cuadrado": ["rectangularc.jpg", "aviador.jpg"],
            "Ovalado": ["redondoc.png", "rectangulars.jpg"],
            "Redondo": ["rectangulara.png", "mariposa.jpg"],
            "Diamante": ["ovalados.png", "rectangulare.jpg"],
            "Oblongo": ["cuadradoa.png", "monturas.png"]
        }
        
        # Cargar imágenes base64
        imagenes_base64 = self.cargar_imagenes_base64()
        imagenes_forma = imagenes_base64.get(forma_rostro, [None, None])
        archivos_forma = nombres_archivos.get(forma_rostro, ["", ""])
        
        print(f"🔍 Imágenes cargadas para {forma_rostro}: {[bool(img) for img in imagenes_forma]}")
        
        # Plantilla base
        plantilla_recomendaciones = {
            "Cuadrado": [
                {
                    "name": "Marco Ejecutivo Premium",
                    "style": "Rectangular Clásico",
                    "reason": "Suaviza los ángulos de tu rostro cuadrado creando equilibrio visual perfecto",
                    "confidence": 95,
                    "optical_fit": {
                        "calibre": "54-18-140",
                        "angulo_pantoscopico": "8-12°",
                        "curvatura_base": "4-6 base",
                        "altura_visual_recomendada": "28-32mm"
                    }
                },
                {
                    "name": "Aviador Titanium Elite", 
                    "style": "Aviador Moderno",
                    "reason": "Las curvas orgánicas contrastan armoniosamente con tu estructura angular definida",
                    "confidence": 88,
                    "optical_fit": {
                        "calibre": "58-16-135",
                        "angulo_pantoscopico": "10-15°",
                        "curvatura_base": "6-8 base",
                        "altura_visual_recomendada": "30-34mm"
                    }
                }
            ],
            "Ovalado": [
                {
                    "name": "Redondo Vintage Luxe",
                    "style": "Redondo Contemporáneo",
                    "reason": "Mantiene el balance natural de tu rostro ovalado perfectamente proporcionado",
                    "confidence": 92,
                    "optical_fit": {
                        "calibre": "52-18-145",
                        "angulo_pantoscopico": "6-10°",
                        "curvatura_base": "2-4 base",
                        "altura_visual_recomendada": "26-30mm"
                    }
                },
                {
                    "name": "Wayfarer Clásico",
                    "style": "Rectangular Suave",
                    "reason": "Añade definición sutil sin romper la armonía de tus facciones balanceadas",
                    "confidence": 85,
                    "optical_fit": {
                        "calibre": "56-20-140",
                        "angulo_pantoscopico": "8-12°",
                        "curvatura_base": "4-6 base",
                        "altura_visual_recomendada": "28-32mm"
                    }
                }
            ],
            "Redondo": [
                {
                    "name": "Rectangular Arquitectónico",
                    "style": "Rectangular Anguloso", 
                    "reason": "Crea contraste visual y define la estructura de tu rostro redondeado",
                    "confidence": 90,
                    "optical_fit": {
                        "calibre": "58-16-135",
                        "angulo_pantoscopico": "10-14°",
                        "curvatura_base": "6-8 base",
                        "altura_visual_recomendada": "30-34mm"
                    }
                },
                {
                    "name": "Cat Eye Elegante",
                    "style": "Mariposa con lift",
                    "reason": "Alarga visualmente y añade un toque de sofisticación femenina",
                    "confidence": 82,
                    "optical_fit": {
                        "calibre": "54-18-140",
                        "angulo_pantoscopico": "8-12°",
                        "curvatura_base": "4-6 base",
                        "altura_visual_recomendada": "26-30mm"
                    }
                }
            ],
            "Diamante": [
                {
                    "name": "Ovalado Sophistique", 
                    "style": "Ovalado Suave",
                    "reason": "Suaviza los pómulos prominentes y equilibra las proporciones faciales",
                    "confidence": 89,
                    "optical_fit": {
                        "calibre": "52-16-145",
                        "angulo_pantoscopico": "6-10°",
                        "curvatura_base": "2-4 base",
                        "altura_visual_recomendada": "24-28mm"
                    }
                },
                {
                    "name": "Rectangular Precision",
                    "style": "Rectangular Estrecho", 
                    "reason": "Complementa la estructura angular sin exagerar las líneas definidas",
                    "confidence": 84,
                    "optical_fit": {
                        "calibre": "54-14-140",
                        "angulo_pantoscopico": "8-12°",
                        "curvatura_base": "4-6 base",
                        "altura_visual_recomendada": "26-30mm"
                    }
                }
            ],
            "Oblongo": [
                {
                    "name": "Cuadrado Statement",
                    "style": "Cuadrado Ancho", 
                    "reason": "Añade volumen horizontal para acortar visualmente el rostro alargado",
                    "confidence": 87,
                    "optical_fit": {
                        "calibre": "60-18-140",
                        "angulo_pantoscopico": "12-16°",
                        "curvatura_base": "6-8 base",
                        "altura_visual_recomendada": "32-36mm"
                    }
                },
                {
                    "name": "Browline Master",
                    "style": "Montura superior acentuada",
                    "reason": "Rompe la longitud facial con diseño estratégico en la parte superior",
                    "confidence": 83,
                    "optical_fit": {
                        "calibre": "56-16-145",
                        "angulo_pantoscopico": "8-12°",
                        "curvatura_base": "4-6 base",
                        "altura_visual_recomendada": "28-32mm"
                    }
                }
            ]
        }
        
        # Obtener recomendaciones base
        recomendaciones = plantilla_recomendaciones.get(forma_rostro, [])
        
        # Rutas locales exactas (para PDF)
        rutas_locales = {
            "Cuadrado": ["venv/marcos/rectangularc.jpg", "venv/marcos/aviador.jpg"],
            "Ovalado": ["venv/marcos/redondoc.png", "venv/marcos/rectangulars.jpg"],
            "Redondo": ["venv/marcos/rectangulara.png", "venv/marcos/mariposa.jpg"],
            "Diamante": ["venv/marcos/ovalados.png", "venv/marcos/rectangulare.jpg"],
            "Oblongo": ["venv/marcos/cuadradoa.png", "venv/marcos/monturas.png"]
        }
        
        # Agregar datos de imágenes
        rutas_forma = rutas_locales.get(forma_rostro, ["", ""])
        
        for i, rec in enumerate(recomendaciones):
            if i < len(imagenes_forma):
                rec["image_data"] = imagenes_forma[i]
                rec["image_url"] = f"/marcos/{archivos_forma[i]}" if i < len(archivos_forma) else None
                rec["local_image"] = rutas_forma[i] if i < len(rutas_forma) else None
        
        # DEBUG final
        print(f"📊 Recomendaciones finales para {forma_rostro}:")
        for i, rec in enumerate(recomendaciones):
            print(f"   {i+1}. {rec['name']}")
            print(f"      image_data: {'✅' if rec.get('image_data') else '❌'}")
            print(f"      image_url: {rec.get('image_url')}")
            print(f"      local_image: {rec.get('local_image')}")
            print(f"      local_image existe: {os.path.exists(rec.get('local_image', '')) if rec.get('local_image') else False}")
        
        return recomendaciones
    
    def analizar_rostro(self, ruta_imagen):
        """Analizar forma del rostro completa"""
        resultado = self.cargar_imagen(ruta_imagen)
        if resultado is None:
            print("ERROR: No se pudo cargar la imagen")
            return None
        
        imagen, imagen_rgb = resultado
        puntos_array = self.detectar_puntos_faciales(imagen_rgb)
        
        if puntos_array is None:
            print("ERROR: No se detectaron rostros con MediaPipe")
            return None
        
        puntos_referencia = self.mapear_puntos_mediapipe(puntos_array, imagen.shape)
        medidas = self.calcular_medidas_faciales(puntos_referencia, puntos_array)
        
        # AGREGAR ANÁLISIS PUPILAR ESPECÍFICO
        analisis_pupilar = self.analizar_distancias_pupilares(puntos_referencia)
        
        forma, descripcion = self.determinar_forma_rostro_avanzada(medidas, None)
        
        # Generar recomendaciones
        recomendaciones = self.generar_recomendaciones_completas(forma)
        
        # DEBUG: Verificar que las recomendaciones tengan optical_fit
        print(f"🔍 DEBUG: Generadas {len(recomendaciones)} recomendaciones")
        for i, rec in enumerate(recomendaciones):
            print(f"  📋 Recomendación {i+1}: {rec.get('name')}")
            print(f"    ✅ Optical fit presente: {'optical_fit' in rec}")
            if 'optical_fit' in rec:
                print(f"    📊 Datos ópticos: {rec['optical_fit']}")
        
        # Convertir puntos a listas para JSON
        puntos_referencia_serializable = {}
        for key, value in puntos_referencia.items():
            puntos_referencia_serializable[key] = [int(value[0]), int(value[1])]
        
        # Obtener rectángulo del rostro
        rect_rostro = self.obtener_rectangulo_rostro(puntos_referencia)
        
        # Convertir imagen a base64 para JSON
        try:
            _, buffer = cv2.imencode('.jpg', imagen)
            imagen_base64 = base64.b64encode(buffer).decode('utf-8')
        except Exception as e:
            print(f"Error convirtiendo imagen a base64: {e}")
            imagen_base64 = None
        
        return {
            'forma': forma,
            'descripcion': descripcion,
            'medidas': medidas,
            'analisis_pupilar': analisis_pupilar,  # AGREGAR ESTA LINEA
            'recomendaciones': recomendaciones,
            'metodo': 'mediapipe_avanzado',
            'estado': 'exitoso',
            # Agregar datos para el PDF (convertidos a tipos serializables)
            'puntos_referencia': puntos_referencia_serializable,
            'puntos_faciales': puntos_array.tolist() if puntos_array is not None else None,
            # AGREGAR ESTOS DATOS PARA LA VISUALIZACIÓN
            'imagen_base64': imagen_base64,  # Imagen en base64
            'rect_rostro': rect_rostro,  # El rectángulo del rostro
        }

def analizar_imagen_archivo(ruta_imagen):
    """Función principal para análisis desde archivo"""
    try:
        print(f">>> Iniciando análisis para: {ruta_imagen}")
        analizador = AnalizadorFormaRostroPDF()
        resultado = analizador.analizar_rostro(ruta_imagen)
        
        if resultado:
            print(">>> Análisis completado exitosamente")
            return resultado
        else:
            print("ERROR: No se pudo analizar la imagen")
            return {
                'error': 'No se pudo detectar rostro en la imagen',
                'estado': 'error'
            }
    except Exception as e:
        print(f"ERROR en el análisis: {str(e)}")
        return {
            'error': f'Error en el análisis: {str(e)}',
            'estado': 'error'
        }

if __name__ == "__main__":
    # Cuando se ejecuta desde Flask, usar la imagen como parámetro si se proporciona
    ruta_imagen = None
    
    # Verificar si se proporcionó una ruta de imagen como argumento
    if len(sys.argv) > 1:
        ruta_imagen = sys.argv[1]
        print(f">>> Parámetro recibido: {ruta_imagen}")
    else:
        print(">>> No se recibió parámetro, usando imagen por defecto")
    
    try:
        resultado = analizar_imagen_archivo(ruta_imagen)
        
        if resultado:
            # Output JSON para Flask
            json_output = json.dumps(resultado, ensure_ascii=False)
            print(json_output)
            sys.stdout.flush()
        else:
            error_output = json.dumps({
                'error': 'No se pudo analizar la imagen',
                'estado': 'error'
            }, ensure_ascii=False)
            print(error_output)
            sys.stdout.flush()
    except Exception as e:
        error_output = json.dumps({
            'error': f'Error ejecutando el análisis: {str(e)}',
            'estado': 'error'
        }, ensure_ascii=False)
        print(error_output)
        sys.stdout.flush()