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

class AnalizadorFormaRostroAvanzado:
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
        
        return (int(x), int(y), int(w), int(h))  # <-- CONVERTIR A int
    
    def generar_recomendaciones_completas(self, forma_rostro, medidas=None):
        """
        Generar recomendaciones completas (estéticas + ópticas)
        basadas en la forma del rostro y medidas proporcionales.
        """

        # --- Estimación Boxing a partir de medidas faciales ---
        def estimar_boxing(medidas):
            if not medidas:
                return {"calibre_horizontal": 52, "calibre_vertical": 40, "puente": 18, "box_code": "52 ⎯ 18"}

            a = round(medidas['B'] / 10, 1)   # Calibre horizontal estimado (mm)
            b = round(medidas['A'] / 15, 1)   # Calibre vertical estimado (mm)
            d = round(medidas['F'] / 10, 1)   # Puente o distancia entre lentes (mm)
            return {
                "calibre_horizontal": a,
                "calibre_vertical": b,
                "puente": d,
                "box_code": f"{a} ⎯ {d}"
            }

        datos_boxing = estimar_boxing(medidas)

        # --- Recomendaciones base con información técnica integrada ---
        recomendaciones_base = {
            "Cuadrado": [
                {
                    "name": "Marco ejemplo 1",
                    "style": "Rectangular Clásico",
                    "reason": (
                        "Suaviza los ángulos de tu rostro cuadrado creando equilibrio visual perfecto. "
                        "Recomendado con monturas de calibre medio y puente pronunciado."
                    ),
                    "optical_fit": {
                        "calibre": datos_boxing["box_code"],
                        "angulo_pantoscopico": "8°–12° ideal para ampliar campo visual inferior",
                        "curvatura_base": "Base 4 o 6 (rostro plano con mandíbula fuerte)",
                        "altura_visual_recomendada": "b/2 + 2 mm (según altura pupilar promedio)"
                    },
                    "confidence": 95
                },
                {
                    "name": "Marco ejemplo 2",
                    "style": "Aviador Moderno",
                    "reason": (
                        "Las curvas orgánicas contrastan armoniosamente con tu estructura angular definida. "
                        "Ideal si preferís monturas metálicas ligeras."
                    ),
                    "optical_fit": {
                        "calibre": datos_boxing["box_code"],
                        "angulo_pantoscopico": "10° moderado",
                        "curvatura_base": "Base 6 para mejor ajuste lateral",
                        "altura_visual_recomendada": "Centro óptico alineado al eje pupilar"
                    },
                    "confidence": 88
                }
            ],
            "Ovalado": [
                {
                    "name": "Marco ejemplo 3",
                    "style": "Redondo Contemporáneo",
                    "reason": (
                        "Mantiene el balance natural de tu rostro ovalado perfectamente proporcionado. "
                        "Recomendado para quienes buscan armonía visual sin exceso de volumen."
                    ),
                    "optical_fit": {
                        "calibre": datos_boxing["box_code"],
                        "angulo_pantoscopico": "8°–10°",
                        "curvatura_base": "Base 4 o 5",
                        "altura_visual_recomendada": "b/2 exacto (alineación natural del eje visual)"
                    },
                    "confidence": 92
                },
                {
                    "name": "Marco ejemplo 4",
                    "style": "Rectangular Suave",
                    "reason": (
                        "Añade definición sutil sin romper la armonía de tus facciones balanceadas. "
                        "Funciona con lentes de cualquier potencia óptica sin distorsión perceptible."
                    ),
                    "optical_fit": {
                        "calibre": datos_boxing["box_code"],
                        "angulo_pantoscopico": "10° estándar",
                        "curvatura_base": "Base 4",
                        "altura_visual_recomendada": "b/2 + 1 mm"
                    },
                    "confidence": 85
                }
            ],
            "Redondo": [
                {
                    "name": "Marco ejemplo 5",
                    "style": "Rectangular Anguloso",
                    "reason": (
                        "Crea contraste visual y define la estructura de tu rostro redondeado. "
                        "El diseño anguloso mejora la percepción de simetría facial."
                    ),
                    "optical_fit": {
                        "calibre": datos_boxing["box_code"],
                        "angulo_pantoscopico": "12° recomendado",
                        "curvatura_base": "Base 4 o menor para evitar sobrecorrección óptica",
                        "altura_visual_recomendada": "b/2 + 2 mm"
                    },
                    "confidence": 90
                },
                {
                    "name": "Marco ejemplo 6",
                    "style": "Mariposa con lift",
                    "reason": (
                        "Alarga visualmente y añade un toque de sofisticación femenina. "
                        "Ideal para rostros con mejillas llenas y estructura suave."
                    ),
                    "optical_fit": {
                        "calibre": datos_boxing["box_code"],
                        "angulo_pantoscopico": "10°–14° (efecto de elevación visual)",
                        "curvatura_base": "Base 6 recomendada",
                        "altura_visual_recomendada": "b/2 + 3 mm (realza mirada superior)"
                    },
                    "confidence": 82
                }
            ],
            "Diamante": [
                {
                    "name": "Marco ejemplo 7",
                    "style": "Ovalado Suave",
                    "reason": (
                        "Suaviza los pómulos prominentes y equilibra las proporciones faciales. "
                        "Las líneas redondeadas neutralizan los ángulos laterales."
                    ),
                    "optical_fit": {
                        "calibre": datos_boxing["box_code"],
                        "angulo_pantoscopico": "9°–11°",
                        "curvatura_base": "Base 5",
                        "altura_visual_recomendada": "b/2 + 1 mm"
                    },
                    "confidence": 89
                },
                {
                    "name": "Marco ejemplo 8",
                    "style": "Rectangular Estrecho",
                    "reason": (
                        "Complementa la estructura angular sin exagerar las líneas definidas. "
                        "Ideal para mantener proporciones y reducir volumen lateral."
                    ),
                    "optical_fit": {
                        "calibre": datos_boxing["box_code"],
                        "angulo_pantoscopico": "10° estándar",
                        "curvatura_base": "Base 4 o 5",
                        "altura_visual_recomendada": "b/2 + 2 mm"
                    },
                    "confidence": 84
                }
            ],
            "Oblongo": [
                {
                    "name": "Marco ejemplo 9",
                    "style": "Cuadrado Ancho",
                    "reason": (
                        "Añade volumen horizontal para acortar visualmente el rostro alargado. "
                        "Recomendado con lentes planas o base reducida."
                    ),
                    "optical_fit": {
                        "calibre": datos_boxing["box_code"],
                        "angulo_pantoscopico": "6°–8° para minimizar inclinación vertical",
                        "curvatura_base": "Base 4",
                        "altura_visual_recomendada": "b/2 - 1 mm"
                    },
                    "confidence": 87
                },
                {
                    "name": "Marco ejemplo 10",
                    "style": "Montura superior acentuada",
                    "reason": (
                        "Rompe la longitud facial con diseño estratégico en la parte superior. "
                        "Ideal para mantener la proporción entre frente y mandíbula."
                    ),
                    "optical_fit": {
                        "calibre": datos_boxing["box_code"],
                        "angulo_pantoscopico": "8°–10°",
                        "curvatura_base": "Base 5",
                        "altura_visual_recomendada": "b/2"
                    },
                    "confidence": 83
                }
            ]
        }

        return recomendaciones_base.get(forma_rostro, [])

    
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
        analisis_pupilar = self.analizar_distancias_pupilares(puntos_referencia)
        forma, descripcion = self.determinar_forma_rostro_avanzada(medidas, None)
        
        # Generar recomendaciones
        recomendaciones = self.generar_recomendaciones_completas(forma, medidas)
        
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
            'recomendaciones': recomendaciones,
            'metodo': 'mediapipe_avanzado',
            'estado': 'exitoso',
            # Agregar datos para el PDF (convertidos a tipos serializables)
            'puntos_referencia': puntos_referencia_serializable,
            'puntos_faciales': puntos_array.tolist() if puntos_array is not None else None,
            # AGREGAR ESTOS DATOS PARA LA VISUALIZACIÓN
            'imagen_base64': imagen_base64,  # Imagen en base64
            'rect_rostro': rect_rostro,  # El rectángulo del rostro
            'analisis_pupilar': analisis_pupilar,

        }

def analizar_imagen_archivo(ruta_imagen):
    """Función principal para análisis desde archivo"""
    try:
        print(f">>> Iniciando análisis para: {ruta_imagen}")
        analizador = AnalizadorFormaRostroAvanzado()
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

def principal(ruta_imagen=None):
    """Función principal para ejecución local"""
    
    # Usar la imagen proporcionada o la predeterminada
    if ruta_imagen is None:
        ruta_imagen = "cuadrado.jpg"  # Imagen por defecto
    
    print(f">>> Ejecutando análisis con imagen: {ruta_imagen}")
    
    if not os.path.exists(ruta_imagen):
        print(f"ERROR: No se encuentra la imagen '{ruta_imagen}'")
        return None
    
    resultado = analizar_imagen_archivo(ruta_imagen)
    return resultado

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
        resultado = principal(ruta_imagen)
        
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