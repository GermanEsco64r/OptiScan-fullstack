import cv2
import numpy as np
import mediapipe as mp
import os
import json
import sys
import base64
from collections import Counter
from sklearn.cluster import KMeans

# Configurar la codificación para Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

class AnalizadorTonoPielMejorado:
    def __init__(self):
        # Inicializar MediaPipe Face Mesh con configuraciones mejoradas
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.7,  # Aumentado para mejor precisión
            min_tracking_confidence=0.7
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        print(">>> Analizador de Tono de Piel Mejorado inicializado")
    
    def cargar_imagen(self, ruta_imagen):
        """Cargar y preparar imagen"""
        try:
            imagen = cv2.imread(ruta_imagen)
            if imagen is None:
                return None, None
            
            # No voltear la imagen para mantener coordenadas originales
            # Voltear solo para visualización si es necesario
            imagen_rgb = cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)
            return imagen, imagen_rgb
        except Exception as e:
            print(f"Error cargando imagen: {e}")
            return None, None
    
    def detectar_puntos_faciales(self, imagen_rgb):
        """Detectar puntos faciales con MediaPipe"""
        resultados = self.face_mesh.process(imagen_rgb)
        
        if not resultados.multi_face_landmarks:
            print("No se detectaron rostros en la imagen")
            return None
        
        landmarks = resultados.multi_face_landmarks[0]
        h, w, _ = imagen_rgb.shape
        puntos = []
        
        for landmark in landmarks.landmark:
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            puntos.append((x, y))
        
        print(f"Detectados {len(puntos)} puntos faciales")
        return np.array(puntos)
    
    def obtener_mascara_facial_completa(self, imagen, puntos_faciales):
        """Crear máscara completa del rostro usando convex hull"""
        h, w = imagen.shape[:2]
        mascara = np.zeros((h, w), dtype=np.uint8)
        
        # Definir índices para el contorno facial (convex hull de la cara)
        # Estos índices corresponden al perímetro del rostro
        contorno_facial_indices = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ]
        
        # Obtener puntos del contorno facial
        puntos_contorno = []
        for idx in contorno_facial_indices:
            if idx < len(puntos_faciales):
                puntos_contorno.append(puntos_faciales[idx])
        
        if len(puntos_contorno) >= 3:
            # Crear convex hull del contorno facial
            puntos_contorno = np.array(puntos_contorno, dtype=np.int32)
            hull = cv2.convexHull(puntos_contorno)
            cv2.fillConvexPoly(mascara, hull, 255)
        
        return mascara
    
    def excluir_areas_no_piel(self, mascara_facial, puntos_faciales):
        """Excluir ojos, labios y cejas de la máscara"""
        h, w = mascara_facial.shape
        mascara_excluir = np.zeros((h, w), dtype=np.uint8)
        
        # Áreas a excluir (ojos, labios, cejas)
        areas_excluir = [
            # Ojo izquierdo
            [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
            # Ojo derecho
            [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
            # Labios
            [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267]
        ]
        
        for indices in areas_excluir:
            puntos_area = []
            for idx in indices:
                if idx < len(puntos_faciales):
                    puntos_area.append(puntos_faciales[idx])
            
            if len(puntos_area) >= 3:
                pts = np.array(puntos_area, dtype=np.int32)
                cv2.fillPoly(mascara_excluir, [pts], 255)
        
        # Restar áreas excluidas de la máscara facial
        mascara_piel = cv2.subtract(mascara_facial, mascara_excluir)
        
        return mascara_piel
    
    def obtener_regiones_piel_optimas(self, puntos_faciales):
        """Definir regiones óptimas para muestreo de piel (mejillas, frente)"""
        regiones = []
        
        # Mejilla izquierda (área plana sin sombras)
        mejilla_izq = [117, 118, 119, 100, 47, 126, 209, 129, 205, 50, 123]
        
        # Mejilla derecha
        mejilla_der = [346, 347, 348, 349, 350, 371, 266, 425, 280, 352, 376]
        
        # Frente (área central sin pelo ni cejas)
        frente = [151, 108, 69, 104, 68, 71, 139, 34, 227, 137, 177, 215, 138]
        
        # Área debajo de los ojos (sin bolsas)
        bajo_ojos = [46, 53, 52, 65, 55, 189, 244, 233, 232, 231, 230, 229, 228, 31, 226, 113]
        
        regiones.extend([mejilla_izq, mejilla_der, frente])
        
        return regiones
    
    def crear_mascara_piel_precisa(self, imagen, puntos_faciales):
        """Crear máscara precisa de la piel del rostro"""
        h, w = imagen.shape[:2]
        
        # 1. Obtener máscara facial completa
        mascara_facial = self.obtener_mascara_facial_completa(imagen, puntos_faciales)
        
        # 2. Excluir áreas no piel
        mascara_piel = self.excluir_areas_no_piel(mascara_facial, puntos_faciales)
        
        # 3. Agregar regiones óptimas de piel
        regiones_optimas = self.obtener_regiones_piel_optimas(puntos_faciales)
        
        for indices in regiones_optimas:
            puntos_region = []
            for idx in indices:
                if idx < len(puntos_faciales):
                    puntos_region.append(puntos_faciales[idx])
            
            if len(puntos_region) >= 3:
                # Crear polígono ligeramente expandido para mejor cobertura
                pts = np.array(puntos_region, dtype=np.int32)
                cv2.fillPoly(mascara_piel, [pts], 255)
        
        # 4. Aplicar operaciones morfológicas para suavizar
        kernel = np.ones((3, 3), np.uint8)
        mascara_piel = cv2.morphologyEx(mascara_piel, cv2.MORPH_CLOSE, kernel)
        mascara_piel = cv2.morphologyEx(mascara_piel, cv2.MORPH_OPEN, kernel)
        
        # 5. Aplicar filtro Gaussiano para suavizar bordes
        mascara_piel = cv2.GaussianBlur(mascara_piel, (5, 5), 0)
        
        return mascara_piel
    
    def aplicar_correccion_iluminacion(self, imagen, mascara):
        """Aplicar corrección de iluminación para normalizar el color"""
        # Obtener región de piel
        piel_region = cv2.bitwise_and(imagen, imagen, mask=mascara)
        
        # Convertir a LAB para separar luminosidad y color
        lab = cv2.cvtColor(piel_region, cv2.COLOR_RGB2LAB)
        
        # Aplicar CLAHE para normalizar iluminación
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        lab[:, :, 0] = clahe.apply(lab[:, :, 0])
        
        # Convertir de vuelta a RGB
        imagen_corregida = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        
        return imagen_corregida, mascara
    
    def extraer_color_piel_mejorado(self, imagen, mascara):
        """Extraer el color principal de la piel con muestreo mejorado"""
        # Aplicar corrección de iluminación
        imagen_corregida, mascara_corregida = self.aplicar_correccion_iluminacion(imagen, mascara)
        
        # Obtener coordenadas donde hay piel
        coords = np.column_stack(np.where(mascara_corregida > 200))  # Usar umbral alto
        
        if len(coords) == 0:
            print("No se encontraron coordenadas de piel en la máscara")
            return None
        
        # Tomar muestras estratégicas (no aleatorias)
        # Priorizar áreas centrales de las mejillas y frente
        muestras_por_lote = min(1500, len(coords))
        
        # Dividir en lotes para muestreo más representativo
        num_lotes = 5
        muestras_por_lote = muestras_por_lote // num_lotes
        
        colores = []
        
        for i in range(num_lotes):
            inicio = i * (len(coords) // num_lotes)
            fin = inicio + muestras_por_lote
            
            if fin <= len(coords):
                batch_coords = coords[inicio:fin]
                
                for y, x in batch_coords:
                    color = imagen_corregida[y, x]
                    # Filtrar colores extremos (posiblemente no piel)
                    if self.es_color_piel_valido(color):
                        colores.append(color)
        
        if len(colores) < 10:
            print("Muy pocos colores de piel válidos encontrados")
            return None
        
        colores_array = np.array(colores)
        
        # Usar K-Means para encontrar colores principales
        n_clusters = min(3, len(colores_array))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(colores_array)
        
        # Encontrar el cluster más grande y más representativo
        cluster_counts = Counter(labels)
        cluster_principal = max(cluster_counts, key=cluster_counts.get)
        tono_principal = kmeans.cluster_centers_[cluster_principal]
        
        # Calcular desviación estándar para verificar consistencia
        cluster_colors = colores_array[labels == cluster_principal]
        std_dev = np.std(cluster_colors, axis=0)
        
        print(f"Color piel extraído: {tono_principal.astype(int)}, Desviación: {std_dev}")
        
        return tono_principal.astype(int).tolist()
    
    def es_color_piel_valido(self, color_rgb):
        """Verificar si un color es válido para piel humana"""
        r, g, b = color_rgb
        
        # Excluir colores extremos
        if r < 20 or g < 20 or b < 20:  # Muy oscuro (probablemente pelo/sombra)
            return False
        if r > 250 and g > 250 and b > 250:  # Muy blanco (probablemente dientes/ojos)
            return False
        
        # Verificar relación típica de colores de piel
        # En piel, generalmente R > G > B o R ≈ G > B
        if not (r >= g - 30 and g >= b - 30):
            return False
        
        # Excluir colores no naturales
        max_diff = max(abs(r - g), abs(g - b), abs(r - b))
        if max_diff > 150:  # Colores muy saturados
            return False
        
        return True
    
    def clasificar_tono_piel(self, color_rgb):
        """Clasificar el tono de piel en categorías mejoradas"""
        r, g, b = color_rgb
        
        # Convertir a diferentes espacios de color para mejor clasificación
        # Luminosidad (Y)
        y = 0.299 * r + 0.587 * g + 0.114 * b
        
        # Saturación
        max_val = max(r, g, b)
        min_val = min(r, g, b)
        if max_val == 0:
            saturation = 0
        else:
            saturation = (max_val - min_val) / max_val * 100
        
        # Determinar categoría principal basada en luminosidad y saturación
        if y < 60:
            categoria = "Oscuro Profundo"
            subcategoria = "Muy Oscuro"
            fitzpatrick = "VI"
        elif y < 90:
            categoria = "Oscuro"
            if saturation > 30:
                subcategoria = "Oscuro Calido"
            else:
                subcategoria = "Oscuro Neutral"
            fitzpatrick = "V"
        elif y < 120:
            categoria = "Moreno"
            if r > g + 15:
                subcategoria = "Moreno Dorado"
            elif b > r + 10:
                subcategoria = "Moreno Olive"
            else:
                subcategoria = "Moreno Neutral"
            fitzpatrick = "IV"
        elif y < 150:
            categoria = "Claro"
            if r > g + 20:
                subcategoria = "Claro Calido"
            elif b > g + 10:
                subcategoria = "Claro Frio"
            else:
                subcategoria = "Claro Neutral"
            fitzpatrick = "III"
        elif y < 180:
            categoria = "Muy Claro"
            if saturation < 20:
                subcategoria = "Porcelana"
            else:
                subcategoria = "Claro Brillante"
            fitzpatrick = "II"
        else:
            categoria = "Piel Blanca"
            subcategoria = "Muy Palido"
            fitzpatrick = "I"
        
        # Determinar subtipo basado en relaciones RGB
        diff_rg = r - g
        diff_gb = g - b
        
        if diff_rg > 20 and diff_gb > 10:
            subtipo = "Calido Dorado"
        elif diff_rg > 15:
            subtipo = "Calido"
        elif diff_gb < -15:
            subtipo = "Frio Rosado"
        elif b > r + 5:
            subtipo = "Frio"
        elif abs(diff_rg) < 15 and abs(diff_gb) < 15:
            subtipo = "Neutral Balanceado"
        else:
            subtipo = "Neutral"
        
        return {
            'categoria': categoria,
            'subcategoria': subcategoria,
            'subtipo': subtipo,
            'fitzpatrick': fitzpatrick,
            'color_rgb': [int(r), int(g), int(b)],
            'color_hex': f"#{int(r):02x}{int(g):02x}{int(b):02x}".upper(),
            'luminosidad': float(y),
            'saturacion': float(saturation),
            'descripcion': f"Tono {subcategoria} con subtipo {subtipo}"
        }
    
    def generar_recomendaciones_colores(self, clasificacion):
        """Generar recomendaciones de colores mejoradas"""
        categoria = clasificacion['categoria']
        subtipo = clasificacion['subtipo']
        
        # Paletas mejoradas basadas en análisis cromático
        paletas = {
            "Oscuro Profundo": {
                "colores": [
                    {"nombre": "Oro Brillante", "hex": "#FFD700", "descripcion": "Aporta luminosidad y contraste elegante"},
                    {"nombre": "Plata Intensa", "hex": "#C0C0C0", "descripcion": "Crea un contraste moderno y sofisticado"},
                    {"nombre": "Esmeralda", "hex": "#50C878", "descripcion": "Realza la profundidad de tonos oscuros"},
                    {"nombre": "Vino Profundo", "hex": "#722F37", "descripcion": "Armoniza con tonos ricos y profundos"}
                ],
                "consejo": "Los tonos metalicos intensos y colores saturados crean un contraste poderoso y elegante.",
                "tonos_evitar": ["Pasteles palidos", "Beige claro", "Gris apagado"]
            },
            "Oscuro": {
                "colores": [
                    {"nombre": "Cobre Calido", "hex": "#B87333", "descripcion": "Complementa tonos calidos profundos"},
                    {"nombre": "Bronce", "hex": "#CD7F32", "descripcion": "Aporta calidez y dimension"},
                    {"nombre": "Azul Real", "hex": "#4169E1", "descripcion": "Crea contraste vibrante"},
                    {"nombre": "Borgona", "hex": "#800020", "descripcion": "Elegante y sofisticado"}
                ],
                "consejo": "Los tonos metalicos calidos y colores ricos funcionan excelentemente.",
                "tonos_evitar": ["Colores apagados", "Tonos lavados", "Neones sucios"]
            },
            "Moreno": {
                "colores": [
                    {"nombre": "Ambar Dorado", "hex": "#FFBF00", "descripcion": "Realza los tonos dorados naturales"},
                    {"nombre": "Terra Cotta", "hex": "#E2725B", "descripcion": "Complementa tonos calidos de piel morena"},
                    {"nombre": "Verde Oliva", "hex": "#808000", "descripcion": "Armoniza con tonos neutrales y calidos"},
                    {"nombre": "Cobre Rosado", "hex": "#B76E79", "descripcion": "Suave y favorecedor"}
                ],
                "consejo": "Los tonos tierra y metalicos calidos crean armonia natural.",
                "tonos_evitar": ["Colores palidos sin contraste", "Grises frios", "Blancos puros"]
            },
            "Claro": {
                "colores": [
                    {"nombre": "Rosa Oro", "hex": "#E7BC91", "descripcion": "Suavemente rosado con toque dorado"},
                    {"nombre": "Plata Suave", "hex": "#D3D3D3", "descripcion": "Elegante y discreto"},
                    {"nombre": "Lavanda", "hex": "#E6E6FA", "descripcion": "Acentua tonos frios naturalmente"},
                    {"nombre": "Champagne", "hex": "#F7E7CE", "descripcion": "Luminoso y refinado"}
                ],
                "consejo": "Los tonos suaves y metalicos delicados complementan sin abrumar.",
                "tonos_evitar": ["Colores intensos oscuros", "Neones brillantes", "Negro puro"]
            },
            "Muy Claro": {
                "colores": [
                    {"nombre": "Plata Brillante", "hex": "#FFFFFF", "descripcion": "Refleja la luminosidad natural"},
                    {"nombre": "Cristal", "hex": "#F0F8FF", "descripcion": "Transparente y moderno"},
                    {"nombre": "Perla", "hex": "#FDEEF4", "descripcion": "Suave y luminoso"},
                    {"nombre": "Diamante", "hex": "#F5F5F5", "descripcion": "Brillo sutil y elegante"}
                ],
                "consejo": "Los tonos claros y translucidos mantienen la delicadeza natural.",
                "tonos_evitar": ["Colores oscuros intensos", "Tonos saturados", "Metalicos oxidados"]
            },
            "Piel Blanca": {
                "colores": [
                    {"nombre": "Plata Iridiscente", "hex": "#F8F8FF", "descripcion": "Reflejos sutiles y modernos"},
                    {"nombre": "Cristal Azulado", "hex": "#F0FFFF", "descripcion": "Enfria y equilibra tonos rosados"},
                    {"nombre": "Blanco Perla", "hex": "#FFFEF2", "descripcion": "Calidez sutil sin amarillear"},
                    {"nombre": "Gris Perla", "hex": "#F2F3F4", "descripcion": "Contraste suave y elegante"}
                ],
                "consejo": "Los tonos frios y neutros evitan el aspecto amarillento.",
                "tonos_evitar": ["Oro amarillo", "Cobre", "Tonos anaranjados"]
            }
        }
        
        # Seleccionar paleta basada en categoría
        paleta_base = paletas.get(categoria, paletas["Moreno"])
        
        # Ajustar según subtipo
        if "Calido" in subtipo:
            colores_recomendados = [paleta_base["colores"][0], paleta_base["colores"][1]]
        elif "Frio" in subtipo:
            colores_recomendados = [paleta_base["colores"][2], paleta_base["colores"][3]]
        else:
            colores_recomendados = [paleta_base["colores"][0], paleta_base["colores"][3]]
        
        return {
            'colores_recomendados': colores_recomendados,
            'consejo_general': paleta_base["consejo"],
            'tonos_evitar': paleta_base["tonos_evitar"],
            'explicacion': f"Para {categoria.lower()} con subtipo {subtipo.lower()}"
        }
    
    def analizar_tono_piel(self, ruta_imagen):
        """Analizar tono de piel completo con método mejorado"""
        try:
            print(f">>> Iniciando análisis de: {ruta_imagen}")
            
            # Cargar imagen
            imagen, imagen_rgb = self.cargar_imagen(ruta_imagen)
            if imagen is None:
                return {
                    'estado': 'error',
                    'error': 'No se pudo cargar la imagen'
                }
            
            print(">>> Imagen cargada correctamente")
            
            # Detectar puntos faciales
            puntos_faciales = self.detectar_puntos_faciales(imagen_rgb)
            if puntos_faciales is None:
                return {
                    'estado': 'error',
                    'error': 'No se detectaron rostros en la imagen'
                }
            
            print(">>> Puntos faciales detectados")
            
            # Crear máscara de piel precisa
            mascara = self.crear_mascara_piel_precisa(imagen_rgb, puntos_faciales)
            
            # Verificar que la máscara tenga suficiente área
            area_piel = cv2.countNonZero(mascara)
            area_total = mascara.shape[0] * mascara.shape[1]
            porcentaje_piel = (area_piel / area_total) * 100
            
            print(f">>> Área de piel detectada: {area_piel} pixeles ({porcentaje_piel:.1f}%)")
            
            if area_piel < 1000:  # Mínimo de 1000 píxeles de piel
                print(f">>> Advertencia: Área de piel insuficiente")
                # Intentar con máscara facial completa como respaldo
                mascara = self.obtener_mascara_facial_completa(imagen_rgb, puntos_faciales)
            
            # Extraer color principal mejorado
            color_piel = self.extraer_color_piel_mejorado(imagen_rgb, mascara)
            if color_piel is None:
                return {
                    'estado': 'error',
                    'error': 'No se pudo extraer color de piel válido'
                }
            
            print(f">>> Color de piel extraído: {color_piel}")
            
            # Clasificar tono
            clasificacion = self.clasificar_tono_piel(color_piel)
            print(f">>> Clasificación: {clasificacion['categoria']} - {clasificacion['subcategoria']}")
            
            # Generar recomendaciones
            recomendaciones = self.generar_recomendaciones_colores(clasificacion)
            
            # Convertir imagen a base64 para visualización
            try:
                # Crear imagen de visualización con máscara
                imagen_visualizacion = imagen_rgb.copy()
                imagen_visualizacion[mascara == 0] = [0, 0, 0]  # Hacer negro el fondo no piel
                
                # Convertir a BGR para JPEG
                imagen_visualizacion_bgr = cv2.cvtColor(imagen_visualizacion, cv2.COLOR_RGB2BGR)
                _, buffer = cv2.imencode('.jpg', imagen_visualizacion_bgr)
                imagen_base64 = base64.b64encode(buffer).decode('utf-8')
            except Exception as e:
                print(f">>> Error generando imagen base64: {e}")
                imagen_base64 = None
            
            return {
                'estado': 'exitoso',
                'clasificacion': clasificacion,
                'recomendaciones': recomendaciones,
                'imagen_base64': imagen_base64,
                'area_piel_pixeles': int(area_piel),
                'porcentaje_piel': float(porcentaje_piel),
                'metodo': 'analisis_tono_piel_mejorado'
            }
            
        except Exception as e:
            print(f">>> Error en análisis: {str(e)}")
            return {
                'estado': 'error',
                'error': f'Error en análisis: {str(e)}'
            }

def analizar_tono_imagen(ruta_imagen):
    """Función principal para análisis de tono desde archivo"""
    try:
        analizador = AnalizadorTonoPielMejorado()
        resultado = analizador.analizar_tono_piel(ruta_imagen)
        return resultado
    except Exception as e:
        return {
            'estado': 'error',
            'error': f'Error en el análisis de tono: {str(e)}'
        }

def principal(ruta_imagen=None):
    """Función principal para ejecución local"""
    if ruta_imagen is None:
        return {
            'estado': 'error',
            'error': 'No se proporcionó imagen'
        }
    
    if not os.path.exists(ruta_imagen):
        return {
            'estado': 'error',
            'error': f'No se encuentra la imagen: {ruta_imagen}'
        }
    
    resultado = analizar_tono_imagen(ruta_imagen)
    return resultado

if __name__ == "__main__":
    ruta_imagen = None
    
    if len(sys.argv) > 1:
        ruta_imagen = sys.argv[1]
    else:
        print("ERROR: Se requiere ruta de imagen como parámetro")
        sys.exit(1)
    
    try:
        resultado = principal(ruta_imagen)
        json_output = json.dumps(resultado, ensure_ascii=False)
        print(json_output)
        sys.stdout.flush()
    except Exception as e:
        error_output = json.dumps({
            'estado': 'error',
            'error': f'Error ejecutando el análisis: {str(e)}'
        }, ensure_ascii=False)
        print(error_output)
        sys.stdout.flush()