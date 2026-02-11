import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from fpdf import FPDF
import base64
import os
from datetime import datetime
import traceback
import unicodedata
from mm import ConversorMedidasReales

class PDFReportGenerator:
    def __init__(self, analizador):
        self.analizador = analizador
        self.conversor = ConversorMedidasReales()
        print("✅ PDFReportGenerator con conversor de medidas inicializado")
        
    def texto_seguro(self, texto):
        """Convertir texto a formato seguro para FPDF - SIN ACENTOS"""
        if texto is None:
            return ""
        
        # Eliminar acentos y caracteres especiales
        texto_seguro = str(texto)
        
        # Primero normalizar los caracteres Unicode (separar acentos)
        texto_seguro = unicodedata.normalize('NFKD', texto_seguro)
        
        # Eliminar todos los caracteres no ASCII
        texto_seguro = texto_seguro.encode('ascii', 'ignore').decode('ascii')
        
        return texto_seguro
        
    def crear_grafico_analisis(self, analisis):
        """Crear gráfico usando la figura generada por debug"""
        if analisis is None:
            print("❌ No hay análisis para crear gráfico")
            return None
            
        try:
            print("🎨 PDF: Generando figura para PDF...")
            
            # Usar la misma función que usa debug para generar la figura
            figura_path = self.crear_figura_directamente(analisis)
            
            if figura_path and os.path.exists(figura_path):
                file_size = os.path.getsize(figura_path)
                print(f"✅ Figura para PDF generada: {figura_path} ({file_size} bytes)")
                return figura_path
            else:
                print("❌ No se pudo generar la figura para el PDF")
                return None
            
        except Exception as e:
            print(f"❌ Error creando gráfico en PDF: {e}")
            print(f"🔍 Traceback: {traceback.format_exc()}")
            return None

    def crear_figura_directamente(self, analisis):
        """Crear la figura de matplotlib directamente"""
        try:
            print("🎨 Creando figura directamente...")
            
            if analisis is None:
                print("❌ No hay análisis para crear figura")
                return None
            
            # Verificar que tenemos los datos necesarios
            if 'imagen_base64' not in analisis:
                print("❌ No hay imagen_base64 en el análisis")
                return None
                
            if 'puntos_referencia' not in analisis:
                print("❌ No hay puntos_referencia en el análisis")
                return None
            
            # Convertir base64 a imagen OpenCV
            try:
                image_data = base64.b64decode(analisis['imagen_base64'])
                nparr = np.frombuffer(image_data, np.uint8)
                imagen = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if imagen is None:
                    print("❌ No se pudo decodificar la imagen base64")
                    return None
            except Exception as e:
                print(f"❌ Error procesando imagen base64: {e}")
                return None
                
            puntos = analisis['puntos_referencia']
            
            # Dibujar rectángulo del rostro
            if 'rect_rostro' in analisis:
                x, y, w, h = analisis['rect_rostro']
                cv2.rectangle(imagen, (x, y), (x+w, y+h), (0, 255, 0), 2)
            else:
                print("⚠️ No hay rect_rostro, calculando uno aproximado...")
                todos_puntos = list(puntos.values())
                xs = [p[0] for p in todos_puntos]
                ys = [p[1] for p in todos_puntos]
                x, y = min(xs), min(ys)
                w, h = max(xs) - x, max(ys) - y
                cv2.rectangle(imagen, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            # Dibujar contorno facial
            if 'puntos_faciales' in analisis and analisis['puntos_faciales'] is not None:
                puntos_array = np.array(analisis['puntos_faciales'])
                contorno = self.analizador.calcular_contorno_rostro(puntos_array)
                for i in range(len(contorno)):
                    cv2.circle(imagen, tuple(contorno[i].astype(int)), 2, (255, 0, 255), -1)
                    if i > 0:
                        cv2.line(imagen, tuple(contorno[i-1].astype(int)), tuple(contorno[i].astype(int)), (255, 0, 255), 1)
            
            # Colores para diferentes puntos
            colores = {
                'barbilla': (0, 255, 255),
                'frente': (255, 0, 0),
                'sien': (128, 0, 128),
                'mandibula': (0, 0, 255),
                'pomulo': (0, 165, 255),
                'ojo': (0, 255, 0),
                'nariz': (255, 255, 0),
                'ceja': (255, 0, 255),
                'boca': (255, 255, 255)
            }
            
            # Dibujar puntos de referencia
            for nombre, punto in puntos.items():
                px, py = punto
                
                if 'sien' in nombre:
                    color = colores['sien']
                elif 'mandibula' in nombre:
                    color = colores['mandibula']
                elif 'pomulo' in nombre:
                    color = colores['pomulo']
                elif 'ojo' in nombre:
                    color = colores['ojo']
                elif 'barbilla' in nombre:
                    color = colores['barbilla']
                elif 'frente' in nombre:
                    color = colores['frente']
                elif 'nariz' in nombre:
                    color = colores['nariz']
                elif 'ceja' in nombre:
                    color = colores['ceja']
                elif 'boca' in nombre:
                    color = colores['boca']
                else:
                    color = (255, 255, 255)
                
                cv2.circle(imagen, (px, py), 6, color, -1)
                cv2.putText(imagen, nombre.split('_')[0], (px-30, py-15), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
            
            # Dibujar líneas de medición
            if 'frente_centro' in puntos and 'barbilla' in puntos:
                cv2.line(imagen, tuple(puntos['frente_centro']), tuple(puntos['barbilla']), (0, 255, 255), 2)
            
            if 'pomulo_izquierdo_ext' in puntos and 'pomulo_derecho_ext' in puntos:
                cv2.line(imagen, tuple(puntos['pomulo_izquierdo_ext']), tuple(puntos['pomulo_derecho_ext']), (0, 165, 255), 2)
            
            if 'frente_izquierda' in puntos and 'frente_derecha' in puntos:
                cv2.line(imagen, tuple(puntos['frente_izquierda']), tuple(puntos['frente_derecha']), (128, 0, 128), 2)
            
            if 'mandibula_izquierda' in puntos and 'mandibula_derecha' in puntos:
                cv2.line(imagen, tuple(puntos['mandibula_izquierda']), tuple(puntos['mandibula_derecha']), (0, 0, 255), 2)
            
            # Información de forma
            forma = analisis.get('forma', 'Desconocida')
            if 'rect_rostro' in analisis:
                x, y, w, h = analisis['rect_rostro']
                cv2.putText(imagen, f"FORMA: {forma}", (x, y-20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            else:
                cv2.putText(imagen, f"FORMA: {forma}", (50, 50), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            
            # Crear figura con matplotlib
            plt.figure(figsize=(14, 10))
            plt.imshow(cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB))
            plt.title(f"ANALISIS DE FORMA FACIAL - {forma}", fontsize=16, weight='bold')
            plt.axis('off')
            
            # Guardar figura temporal
            temp_path = "temp_direct_figure.png"
            plt.tight_layout()
            plt.savefig(temp_path, dpi=150, bbox_inches='tight', facecolor='white')
            plt.close()
            
            print(f"✅ Figura directa guardada en: {temp_path}")
            return temp_path
            
        except Exception as e:
            print(f"❌ Error creando figura directa: {e}")
            print(f"🔍 Traceback: {traceback.format_exc()}")
            return None

    def hex_to_rgb(self, hex_color):
        """Convertir color HEX a RGB"""
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 6:
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        return (0, 0, 0)
    
    def es_color_claro(self, hex_color):
        """Determinar si un color HEX es claro (necesita borde para visibilidad)"""
        try:
            hex_color = hex_color.lstrip('#')
            if len(hex_color) == 6:
                r = int(hex_color[0:2], 16)
                g = int(hex_color[2:4], 16)
                b = int(hex_color[4:6], 16)
                
                # Calcular luminosidad (fórmula estándar)
                luminosidad = (0.299 * r + 0.587 * g + 0.114 * b) / 255
                
                # Si la luminosidad es mayor a 0.7, es un color claro
                return luminosidad > 0.7
            return False
        except:
            return False

    def dibujar_circulo_color(self, pdf, x, y, hex_color, diametro=10):
        """Dibujar un círculo con el color especificado - VERSIÓN MEJORADA"""
        try:
            hex_color = hex_color.lstrip('#')
            
            if len(hex_color) == 6:
                r = int(hex_color[0:2], 16)
                g = int(hex_color[2:4], 16)
                b = int(hex_color[4:6], 16)
            elif len(hex_color) == 3:
                r = int(hex_color[0] * 2, 16)
                g = int(hex_color[1] * 2, 16)
                b = int(hex_color[2] * 2, 16)
            else:
                r, g, b = 0, 0, 0
            
            # Configurar color de relleno
            pdf.set_fill_color(r, g, b)
            
            # Dibujar círculo con relleno
            pdf.ellipse(x, y, diametro, diametro, 'F')
            
            # Restaurar color de relleno a blanco
            pdf.set_fill_color(255, 255, 255)
            
            # Agregar borde sutil para todos los círculos
            pdf.set_draw_color(100, 100, 100)
            pdf.set_line_width(0.1)
            pdf.ellipse(x, y, diametro, diametro, 'D')
            
            # Restaurar color de dibujo
            pdf.set_draw_color(0, 0, 0)
            
            return True
        except Exception as e:
            print(f"⚠️ Error dibujando círculo color {hex_color}: {e}")
            return False
        
    def generar_seccion_medidas_reales(self, pdf, analisis):
        """Generar sección de medidas reales (cm/mm) en el PDF - VERSIÓN CORREGIDA"""
        try:
            if 'medidas_convertidas' not in analisis:
                print("⚠️ No hay medidas convertidas para mostrar")
                return
            
            # Verificar si necesitamos nueva página
            if pdf.get_y() > 200:  # Si estamos cerca del final de la página
                pdf.add_page()
            
            medidas_convertidas = analisis['medidas_convertidas']
            medidas_cm = medidas_convertidas.get('medidas_cm', {})
            medidas_mm = medidas_convertidas.get('medidas_mm', {})
            medidas_optometria = medidas_convertidas.get('medidas_optometria', {})
            factor = medidas_convertidas.get('factor_conversion', {})
            
            # Título de la sección
            pdf.set_font('Arial', 'B', 18)
            titulo = self.texto_seguro('MEDIDAS EN UNIDADES REALES')
            pdf.cell(0, 15, titulo, 0, 1, 'C')
            pdf.ln(5)
            
            # Línea decorativa
            pdf.set_draw_color(0, 0, 0)
            pdf.set_line_width(0.5)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(8)
            
            # Información del factor de conversión
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 10, self.texto_seguro('FACTOR DE CONVERSIÓN DETECTADO:'), 0, 1, 'L')
            pdf.set_font('Arial', '', 10)
            
            pixeles_por_cm = factor.get('pixeles_por_cm', 37.8)
            pdf.multi_cell(0, 6, self.texto_seguro(f"• Píxeles por centímetro: {pixeles_por_cm:.2f} px/cm"))
            pdf.multi_cell(0, 6, self.texto_seguro(f"• Píxeles por milímetro: {pixeles_por_cm/10:.2f} px/mm"))
            
            # Referencia detectada
            if analisis.get('deteccion_referencia') and analisis['deteccion_referencia'].get('deteccion'):
                deteccion = analisis['deteccion_referencia']['deteccion']
                if 'dimensiones_px' in deteccion:
                    dims = deteccion['dimensiones_px']
                    pdf.multi_cell(0, 6, self.texto_seguro(
                        f"• Referencia detectada: {dims.get('ancho', 0)}x{dims.get('alto', 0)} píxeles = 5x5 cm"
                    ))
            else:
                pdf.multi_cell(0, 6, self.texto_seguro("• Nota: Usando factor de conversión estimado"))
            
            pdf.ln(8)
            
            # Tabla de medidas convertidas
            pdf.set_font('Arial', 'B', 14)
            pdf.cell(0, 10, self.texto_seguro('TABLA DE MEDIDAS CONVERTIDAS'), 0, 1, 'L')
            pdf.ln(5)
            
            # Encabezados de tabla
            pdf.set_font('Arial', 'B', 9)
            pdf.cell(80, 8, self.texto_seguro('MEDIDA'), 1, 0, 'C')
            pdf.cell(35, 8, self.texto_seguro('CM'), 1, 0, 'C')
            pdf.cell(35, 8, self.texto_seguro('MM'), 1, 1, 'C')
            
            # Mapeo de nombres
            nombres_medidas = {
                'A': 'Largo del Rostro',
                'B': 'Ancho de Pómulos',
                'C': 'Ancho de Frente',
                'D': 'Ancho de Mandíbula',
                'E': 'Ancho entre Sienes',
                'F': 'Distancia entre Ojos',
                'DNP_I': 'DNP Izquierda',
                'DNP_D': 'DNP Derecha',
                'DIP': 'Distancia Interpupilar'
            }
            
            pdf.set_font('Arial', '', 9)
            
            for clave, nombre in nombres_medidas.items():
                if f'{clave}_cm' in medidas_cm:
                    cm_val = medidas_cm[f'{clave}_cm']
                    mm_val = medidas_mm.get(f'{clave}_mm', cm_val * 10)
                    
                    # Verificar si necesitamos nueva página antes de agregar fila
                    if pdf.get_y() > 250:  # Si estamos cerca del final
                        pdf.add_page()
                    
                    pdf.cell(80, 8, self.texto_seguro(nombre), 1, 0, 'L')
                    pdf.cell(35, 8, f"{cm_val:.2f}", 1, 0, 'C')
                    pdf.cell(35, 8, f"{mm_val:.1f}", 1, 1, 'C')
            
            pdf.ln(10)
            
            # ====================================================
            # SECCIÓN COMENTADA: RECOMENDACIONES PARA GAFAS
            # Se mantiene comentada según solicitud del usuario
            # ====================================================
            """
            # Recomendaciones para gafas
            if medidas_optometria:
                # Verificar espacio para esta sección
                if pdf.get_y() > 220:
                    pdf.add_page()
                
                pdf.set_font('Arial', 'B', 14)
                pdf.cell(0, 10, self.texto_seguro('RECOMENDACIONES PARA GAFAS'), 0, 1, 'L')
                pdf.ln(5)
                
                pdf.set_font('Arial', 'B', 11)
                pdf.cell(0, 7, self.texto_seguro('Medidas Pupilares:'), 0, 1, 'L')
                pdf.set_font('Arial', '', 10)
                
                if 'DNP_I_cm' in medidas_optometria and 'DNP_D_cm' in medidas_optometria:
                    dnp_i = medidas_optometria['DNP_I_cm']
                    dnp_d = medidas_optometria['DNP_D_cm']
                    dip = medidas_optometria.get('DIP_cm', 0)
                    
                    pdf.multi_cell(0, 6, self.texto_seguro(f"• DNP Izquierda: {dnp_i:.2f} cm"))
                    pdf.multi_cell(0, 6, self.texto_seguro(f"• DNP Derecha: {dnp_d:.2f} cm"))
                    pdf.multi_cell(0, 6, self.texto_seguro(f"• DIP Total: {dip:.2f} cm"))
                    
                    # Verificar suma DNP_I + DNP_D ≈ DIP
                    suma_dnp = dnp_i + dnp_d
                    diferencia = abs(suma_dnp - dip)
                    if diferencia < 0.5:
                        pdf.multi_cell(0, 6, self.texto_seguro(f"✓ Verificación: DNP_I + DNP_D = {suma_dnp:.2f} cm ≈ DIP ({dip:.2f} cm)"))
                    else:
                        pdf.multi_cell(0, 6, self.texto_seguro(f"⚠ Nota: Diferencia de {diferencia:.2f} cm entre suma de DNPs y DIP"))
                
                if 'recomendacion_puente' in medidas_optometria:
                    rec = medidas_optometria['recomendacion_puente']
                    pdf.set_font('Arial', 'B', 11)
                    pdf.cell(0, 7, self.texto_seguro('Puente Recomendado:'), 0, 1, 'L')
                    pdf.set_font('Arial', '', 10)
                    pdf.multi_cell(0, 6, self.texto_seguro(f"• Tamaño: {rec.get('tamano', 'N/A')}"))
                    if 'razon' in rec:
                        pdf.multi_cell(0, 6, self.texto_seguro(f"• Razón: {rec.get('razon', '')}"))
                
                if 'recomendacion_calibre' in medidas_optometria:
                    rec = medidas_optometria['recomendacion_calibre']
                    pdf.set_font('Arial', 'B', 11)
                    pdf.cell(0, 7, self.texto_seguro('Calibre Recomendado:'), 0, 1, 'L')
                    pdf.set_font('Arial', '', 10)
                    pdf.multi_cell(0, 6, self.texto_seguro(f"• {rec.get('calibre', 'N/A')}"))
                    if 'rango' in rec:
                        pdf.multi_cell(0, 6, self.texto_seguro(f"• Rango: {rec.get('rango', '')}"))
                
                if 'asimetria_cm' in medidas_optometria:
                    asimetria = medidas_optometria['asimetria_cm']
                    pdf.set_font('Arial', 'B', 11)
                    pdf.cell(0, 7, self.texto_seguro('Análisis de Simetría:'), 0, 1, 'L')
                    pdf.set_font('Arial', '', 10)
                    pdf.multi_cell(0, 6, self.texto_seguro(f"• Asimetría: {asimetria:.2f} cm"))
                    
                    if asimetria < 0.3:
                        evaluacion = "Simetría excelente"
                    elif asimetria < 0.5:
                        evaluacion = "Simetría buena"
                    elif asimetria < 0.8:
                        evaluacion = "Ligera asimetría"
                    else:
                        evaluacion = "Asimetría notable"
                    
                    pdf.multi_cell(0, 6, self.texto_seguro(f"• Evaluación: {evaluacion}"))
                
                pdf.ln(5)
            """
            # ====================================================
            # FIN DE SECCIÓN COMENTADA
            # ====================================================
            
            # Nota final
            pdf.set_font('Arial', 'I', 8)
            pdf.set_text_color(100, 100, 100)
            pdf.multi_cell(0, 5, self.texto_seguro(
                "Nota: Estas medidas son estimaciones basadas en análisis de imagen. "
                "Para medidas exactas consulte con un profesional."
            ))
            pdf.set_text_color(0, 0, 0)
            
        except Exception as e:
            print(f"❌ Error en generar_seccion_medidas_reales: {e}")
            import traceback
            traceback.print_exc()

    def generar_seccion_tono_piel(self, pdf, tono_piel):
        """Generar sección de análisis de tono de piel con círculos de color mejorados - SIN BULLETS"""
        if not tono_piel or tono_piel.get('estado') != 'exitoso':
            return
        
        print("🎨 PDF: Agregando sección de tono de piel con círculos de color...")
        
        # Agregar página para el análisis de tono
        pdf.add_page()
        
        pdf.set_font('Arial', 'B', 24)
        pdf.cell(0, 20, self.texto_seguro('ANALISIS DE TONO DE PIEL'), 0, 1, 'C')
        pdf.ln(10)
        
        clasificacion = tono_piel.get('clasificacion', {})
        recomendaciones = tono_piel.get('recomendaciones', {})
        
        # Información de clasificación - SIN BULLETS
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 12, self.texto_seguro('CLASIFICACION DEL TONO'), 0, 1, 'L')
        pdf.ln(5)
        
        pdf.set_font('Arial', '', 12)
        
        # Información de clasificación SIN bullets
        pdf.multi_cell(0, 8, self.texto_seguro(f"Categoria: {clasificacion.get('categoria', 'No disponible')}"))
        pdf.multi_cell(0, 8, self.texto_seguro(f"Subtipo: {clasificacion.get('subtipo', 'No disponible')}"))
        pdf.multi_cell(0, 8, self.texto_seguro(f"Escala Fitzpatrick: {clasificacion.get('fitzpatrick', 'No disponible')}"))
        pdf.multi_cell(0, 8, self.texto_seguro(f"Descripcion: {clasificacion.get('descripcion', 'No disponible')}"))
        
        # Mostrar color detectado con círculo
        color_hex = clasificacion.get('color_hex', '#000000')
        color_rgb = clasificacion.get('color_rgb', [0, 0, 0])
        
        pdf.ln(10)
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, self.texto_seguro("COLOR DETECTADO DE TU PIEL"), 0, 1, 'L')
        
        # Posición para el círculo del color detectado
        x_circle = 20
        y_circle = pdf.get_y() + 5
        
        # Dibujar círculo grande para el color detectado
        self.dibujar_circulo_color(pdf, x_circle, y_circle, color_hex, diametro=15)
        
        # Información del color detectado al lado del círculo
        pdf.set_xy(x_circle + 25, y_circle)
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 6, self.texto_seguro("Color de tu piel:"), 0, 1)
        
        pdf.set_xy(x_circle + 25, y_circle + 7)
        pdf.set_font('Arial', '', 10)
        pdf.cell(0, 5, self.texto_seguro(f"HEX: {color_hex}"), 0, 1)
        
        pdf.set_xy(x_circle + 25, y_circle + 14)
        pdf.cell(0, 5, self.texto_seguro(f"RGB: ({color_rgb[0]}, {color_rgb[1]}, {color_rgb[2]})"), 0, 1)
        
        # Verificar si el color es muy claro y agregar borde para visibilidad
        if sum(color_rgb) > 600:  # Si es un color claro
            pdf.set_draw_color(0, 0, 0)  # Borde negro
            pdf.set_line_width(0.2)
            pdf.ellipse(x_circle, y_circle, 15, 15, 'D')  # Dibujar círculo vacío como borde
        
        pdf.ln(25)  # Más espacio después del color detectado
        
        # Recomendaciones de colores
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 12, self.texto_seguro('COLORES RECOMENDADOS PARA TUS LENTES'), 0, 1, 'L')
        pdf.ln(5)
        
        colores_recomendados = recomendaciones.get('colores_recomendados', [])
        
        if colores_recomendados:
            # Configurar para dos columnas
            page_width = 210  # Ancho A4 en mm
            margin = 10
            col_width = (page_width - 3 * margin) / 2
            
            for i, color in enumerate(colores_recomendados):
                hex_color = color.get('hex', '#000000')
                nombre = color.get('nombre', 'No disponible')
                descripcion = color.get('descripcion', 'No disponible')
                
                # Determinar posición (izquierda o derecha)
                if i % 2 == 0:  # Columna izquierda
                    x_pos = margin
                else:  # Columna derecha
                    x_pos = margin + col_width + margin
                
                # Si estamos en la segunda columna o se acabó la página, agregar nueva línea
                if i % 2 == 0:
                    y_start = pdf.get_y()
                else:
                    pdf.set_xy(x_pos, y_start)
                
                # Altura máxima para cada bloque de color
                bloque_altura = 35
                
                # Dibujar contenedor para el color
                pdf.set_draw_color(200, 200, 200)
                pdf.set_line_width(0.1)
                pdf.rect(x_pos, pdf.get_y(), col_width, bloque_altura)
                
                # Dibujar círculo de color (más grande)
                circle_x = x_pos + 5
                circle_y = pdf.get_y() + 5
                self.dibujar_circulo_color(pdf, circle_x, circle_y, hex_color, diametro=12)
                
                # Verificar si el color es muy claro y agregar borde
                if self.es_color_claro(hex_color):
                    pdf.set_draw_color(0, 0, 0)
                    pdf.set_line_width(0.2)
                    pdf.ellipse(circle_x, circle_y, 12, 12, 'D')
                
                # Información del color
                text_x = circle_x + 20
                text_y = circle_y
                
                pdf.set_xy(text_x, text_y)
                pdf.set_font('Arial', 'B', 11)
                pdf.cell(col_width - 25, 6, self.texto_seguro(nombre), 0, 1)
                
                pdf.set_xy(text_x, text_y + 7)
                pdf.set_font('Arial', '', 9)
                pdf.cell(col_width - 25, 5, self.texto_seguro(f"HEX: {hex_color}"), 0, 1)
                
                # Descripción en múltiples líneas
                pdf.set_xy(text_x, text_y + 13)
                pdf.set_font('Arial', 'I', 8)
                
                # Dividir la descripción si es muy larga
                descripcion_texto = self.texto_seguro(descripcion)
                if len(descripcion_texto) > 50:
                    descripcion_texto = descripcion_texto[:47] + "..."
                
                pdf.multi_cell(col_width - 25, 4, descripcion_texto)
                
                # Si estamos en la columna derecha, movernos a la siguiente fila
                if i % 2 == 1 or i == len(colores_recomendados) - 1:
                    pdf.ln(bloque_altura + 5)
                
                # Si estamos cerca del final de la página, agregar nueva página
                if pdf.get_y() > 250 and i < len(colores_recomendados) - 1:
                    pdf.add_page()
                    pdf.ln(10)
        
        # Consejos y tonos a evitar (en nueva página si es necesario)
        if pdf.get_y() > 200:
            pdf.add_page()
        
        pdf.ln(10)
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 12, self.texto_seguro('CONSEJOS DE ESTILO'), 0, 1, 'L')
        pdf.ln(5)
        
        pdf.set_font('Arial', '', 10)
        if recomendaciones.get('consejo_general'):
            consejo = self.texto_seguro(recomendaciones['consejo_general'])
            pdf.multi_cell(0, 6, f"{consejo}")
        
        if recomendaciones.get('tonos_evitar'):
            pdf.ln(5)
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 8, self.texto_seguro("Tonos a evitar:"), 0, 1, 'L')
            pdf.set_font('Arial', '', 10)
            for tono in recomendaciones['tonos_evitar']:
                pdf.multi_cell(0, 6, self.texto_seguro(f"{tono}"))

    def generar_informe_detallado_medidas(self, pdf, analisis, recomendaciones=None):
        """Generar seccion detallada de medidas con subtitulos, explicaciones y recomendaciones opticas"""
        
        # Obtener medidas convertidas si existen
        medidas_convertidas = analisis.get('medidas_convertidas', {})
        medidas_cm = medidas_convertidas.get('medidas_cm', {})
        medidas_px = analisis.get('medidas', {})
        
        # Verificar si tenemos medidas convertidas
        usar_cm = bool(medidas_cm)
        
        # --- MEDIDAS PRINCIPALES ---
        if usar_cm:
            pdf.set_font('Arial', 'B', 16)
            pdf.cell(0, 12, self.texto_seguro('MEDIDAS PRINCIPALES (en cm)'), 0, 1, 'L')
        else:
            pdf.set_font('Arial', 'B', 16)
            pdf.cell(0, 12, self.texto_seguro('MEDIDAS PRINCIPALES (en pixeles)'), 0, 1, 'L')
        pdf.ln(5)
        
        # A: Largo del rostro
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Largo Total del Rostro'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        
        if usar_cm and 'A_cm' in medidas_cm:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_cm['A_cm']:.2f} cm"))
            # También mostrar el valor en píxeles entre paréntesis
            if 'A' in medidas_px:
                pdf.multi_cell(0, 6, self.texto_seguro(f"({medidas_px.get('A', 0):.2f} px)"))
        else:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_px.get('A', 0):.2f} px"))
        
        pdf.multi_cell(0, 6, self.texto_seguro("Explicacion: Distancia vertical desde el centro de la frente hasta la punta de la barbilla. Representa la longitud total del rostro."))
        pdf.ln(3)
        
        # B: Ancho de pomulos
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Ancho de Pomulos'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        
        if usar_cm and 'B_cm' in medidas_cm:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_cm['B_cm']:.2f} cm"))
            if 'B' in medidas_px:
                pdf.multi_cell(0, 6, self.texto_seguro(f"({medidas_px.get('B', 0):.2f} px)"))
        else:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_px.get('B', 0):.2f} px"))
        
        pdf.multi_cell(0, 6, self.texto_seguro("Explicacion: Distancia horizontal entre los puntos mas externos de los pomulos. Indica el ancho maximo del rostro."))
        pdf.ln(3)
        
        # C: Ancho de la frente
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Ancho de la Frente'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        
        if usar_cm and 'C_cm' in medidas_cm:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_cm['C_cm']:.2f} cm"))
            if 'C' in medidas_px:
                pdf.multi_cell(0, 6, self.texto_seguro(f"({medidas_px.get('C', 0):.2f} px)"))
        else:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_px.get('C', 0):.2f} px"))
        
        pdf.multi_cell(0, 6, self.texto_seguro("Explicacion: Distancia entre los puntos laterales de la frente. Determina la amplitud de la zona superior del rostro."))
        pdf.ln(3)
        
        # D: Ancho de mandibula
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Ancho de Mandibula'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        
        if usar_cm and 'D_cm' in medidas_cm:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_cm['D_cm']:.2f} cm"))
            if 'D' in medidas_px:
                pdf.multi_cell(0, 6, self.texto_seguro(f"({medidas_px.get('D', 0):.2f} px)"))
        else:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_px.get('D', 0):.2f} px"))
        
        pdf.multi_cell(0, 6, self.texto_seguro("Explicacion: Distancia entre los puntos angulares de la mandibula. Define la estructura inferior del rostro."))
        pdf.ln(3)
        
        # E: Ancho entre sienes
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Ancho entre Sienes'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        
        if usar_cm and 'E_cm' in medidas_cm:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_cm['E_cm']:.2f} cm"))
            if 'E' in medidas_px:
                pdf.multi_cell(0, 6, self.texto_seguro(f"({medidas_px.get('E', 0):.2f} px)"))
        else:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_px.get('E', 0):.2f} px"))
        
        pdf.multi_cell(0, 6, self.texto_seguro("Explicacion: Distancia horizontal entre las sienes. Representa el ancho en la zona media-alta del rostro."))
        pdf.ln(3)
        
        # F: Distancia entre ojos
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Distancia entre Ojos'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        
        if usar_cm and 'F_cm' in medidas_cm:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_cm['F_cm']:.2f} cm"))
            if 'F' in medidas_px:
                pdf.multi_cell(0, 6, self.texto_seguro(f"({medidas_px.get('F', 0):.2f} px)"))
        else:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_px.get('F', 0):.2f} px"))
        
        pdf.multi_cell(0, 6, self.texto_seguro("Explicacion: Separacion horizontal entre los centros de ambos ojos. Afecta la armonia facial."))
        pdf.ln(10)
        
        # --- MEDIDAS PUPILARES ---
        if usar_cm:
            pdf.set_font('Arial', 'B', 16)
            pdf.cell(0, 12, self.texto_seguro('MEDIDAS PUPILARES PARA GAFAS (en cm)'), 0, 1, 'L')
        else:
            pdf.set_font('Arial', 'B', 16)
            pdf.cell(0, 12, self.texto_seguro('MEDIDAS PUPILARES PARA GAFAS (en pixeles)'), 0, 1, 'L')
        pdf.ln(5)
        
        # DNP_I
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Distancia Naso-Pupilar Izquierda (DNP_I)'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        
        if usar_cm and 'DNP_I_cm' in medidas_cm:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_cm['DNP_I_cm']:.2f} cm"))
            if 'DNP_I' in medidas_px:
                pdf.multi_cell(0, 6, self.texto_seguro(f"({medidas_px.get('DNP_I', 0):.2f} px)"))
        else:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_px.get('DNP_I', 0):.2f} px"))
        
        pdf.multi_cell(0, 6, self.texto_seguro("Explicacion: Distancia desde la raiz de la nariz hasta el centro de la pupila del ojo izquierdo. Es fundamental para el centrado del lente izquierdo en la montura."))
        pdf.ln(3)
        
        # DNP_D
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Distancia Naso-Pupilar Derecha (DNP_D)'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        
        if usar_cm and 'DNP_D_cm' in medidas_cm:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_cm['DNP_D_cm']:.2f} cm"))
            if 'DNP_D' in medidas_px:
                pdf.multi_cell(0, 6, self.texto_seguro(f"({medidas_px.get('DNP_D', 0):.2f} px)"))
        else:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_px.get('DNP_D', 0):.2f} px"))
        
        pdf.multi_cell(0, 6, self.texto_seguro("Explicacion: Distancia desde la raiz de la nariz hasta el centro de la pupila del ojo derecho. Es fundamental para el centrado del lente derecho en la montura."))
        pdf.ln(3)
        
        # DIP
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Distancia Inter-Pupilar (DIP)'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        
        if usar_cm and 'DIP_cm' in medidas_cm:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_cm['DIP_cm']:.2f} cm"))
            if 'DIP' in medidas_px:
                pdf.multi_cell(0, 6, self.texto_seguro(f"({medidas_px.get('DIP', 0):.2f} px)"))
        else:
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_px.get('DIP', 0):.2f} px"))
        
        pdf.multi_cell(0, 6, self.texto_seguro("Explicacion: Distancia total entre los centros de ambas pupilas. Se verifica que DNP_I + DNP_D = DIP. Esta medida es crucial para el ajuste de la montura."))
        pdf.ln(3)
        
        # --- VERIFICACION DE MEDIDAS ---
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Verificacion de Medidas'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        
        # Obtener diferencia (en cm si está disponible)
        if usar_cm:
            # Calcular diferencia en cm
            dnp_i_cm = medidas_cm.get('DNP_I_cm', 0)
            dnp_d_cm = medidas_cm.get('DNP_D_cm', 0)
            dip_cm = medidas_cm.get('DIP_cm', 0)
            diferencia_cm = abs((dnp_i_cm + dnp_d_cm) - dip_cm)
            diferencia = diferencia_cm
            unidad = "cm"
        else:
            diferencia = medidas_px.get('diferencia_DIP', 0)
            unidad = "px"
        
        pdf.multi_cell(0, 6, self.texto_seguro(f"Diferencia entre metodos: {diferencia:.2f} {unidad}"))

        # Evaluación con explicación detallada
        if diferencia < (0.1 if usar_cm else 2):  # Umbral ajustado por unidad
            evaluacion = "[OK] Excelente precision en las mediciones"
            explicacion = (f"La diferencia de {diferencia:.2f} {unidad} entre los metodos de medicion es minimo, indicando "
                        "una consistencia excepcional en las mediciones. La suma de las distancias individuales "
                        "(DNP_I + DNP_D) coincide casi perfectamente con la distancia interpupilar directa (DIP).")
        elif diferencia < (0.3 if usar_cm else 5):
            evaluacion = "[OK] Buena precision en las mediciones"
            explicacion = (f"La diferencia de {diferencia:.2f} {unidad} esta dentro del rango de variacion aceptable. "
                        "Las mediciones son consistentes y confiables para el montaje de gafas.")
        elif diferencia < (0.5 if usar_cm else 10):
            evaluacion = "[ADVERTENCIA] Precision moderada"
            explicacion = (f"La diferencia de {diferencia:.2f} {unidad} sugiere una ligera variacion entre metodos. "
                        "Esto puede deberse a movimientos menores del rostro durante la captura. "
                        "Se recomienda verificacion visual pero las mediciones son utilizables.")
        elif diferencia < (0.8 if usar_cm else 15):
            evaluacion = "[ADVERTENCIA] Precision baja - verificacion recomendada"
            explicacion = (f"La diferencia de {diferencia:.2f} {unidad} indica una discrepancia significativa. "
                        "Puede deberse a asimetria facial pronunciada, movimiento durante la captura, "
                        "o error de medicion. Se recomienda verificacion manual.")
        else:
            evaluacion = "[ERROR] Discrepancia significativa"
            explicacion = (f"La diferencia de {diferencia:.2f} {unidad} es demasiado alta. "
                        "Esto puede indicar problemas en la deteccion de puntos faciales, "
                        "movimiento excesivo durante la captura, o asimetria facial extrema. "
                        "Se requiere verificacion manual y posible recaptura.")

        pdf.multi_cell(0, 6, self.texto_seguro(f"Evaluacion: {evaluacion}"))
        pdf.multi_cell(0, 6, self.texto_seguro(f"Explicacion: {explicacion}"))

        # Información adicional sobre la verificación
        pdf.ln(3)
        pdf.set_font('Arial', 'I', 9)
        pdf.multi_cell(0, 5, self.texto_seguro(
            "Nota: Esta verificacion compara dos metodos de medicion: (1) Suma de distancias individuales "
            "DNP_I + DNP_D vs (2) Medicion directa de DIP. Una diferencia baja indica consistencia metodologica."
        ))
        pdf.ln(5)

        # --- ANALISIS DE SIMETRIA FACIAL ---
        if 'analisis_pupilar' in analisis and 'asimetria_px' in analisis['analisis_pupilar']:
            asimetria_px = analisis['analisis_pupilar'].get('asimetria_px', 0)
            asimetria_cm = asimetria_px / 37.8 if usar_cm else 0  # Convertir usando factor de conversión por defecto
            
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 8, self.texto_seguro('Analisis de Simetria Facial'), 0, 1, 'L')
            pdf.set_font('Arial', '', 10)
            
            if usar_cm:
                pdf.multi_cell(0, 6, self.texto_seguro(f"Diferencia entre ojos: {asimetria_cm:.2f} cm"))
                asimetria_valor = asimetria_cm
            else:
                pdf.multi_cell(0, 6, self.texto_seguro(f"Diferencia entre ojos: {asimetria_px:.2f} px"))
                asimetria_valor = asimetria_px
            
            # Umbrales ajustados según unidad
            if usar_cm:
                if asimetria_valor < 0.1:
                    eval_simetria = "Simetria excelente"
                    explicacion_simetria = "Los ojos estan casi perfectamente alineados horizontalmente."
                elif asimetria_valor < 0.3:
                    eval_simetria = "Simetria buena"
                    explicacion_simetria = "Ligera asimetria natural, comun en la mayoria de personas."
                elif asimetria_valor < 0.5:
                    eval_simetria = "Simetria moderada"
                    explicacion_simetria = "Asimetria noticeable que puede requerir ajustes en el centrado de lentes."
                else:
                    eval_simetria = "Asimetria significativa"
                    explicacion_simetria = "Diferencia pronunciada que requiere centrado individualizado para cada ojo."
            else:
                if asimetria_valor < 3:
                    eval_simetria = "Simetria excelente"
                    explicacion_simetria = "Los ojos estan casi perfectamente alineados horizontalmente."
                elif asimetria_valor < 7:
                    eval_simetria = "Simetria buena"
                    explicacion_simetria = "Ligera asimetria natural, comun en la mayoria de personas."
                elif asimetria_valor < 12:
                    eval_simetria = "Simetria moderada"
                    explicacion_simetria = "Asimetria noticeable que puede requerir ajustes en el centrado de lentes."
                else:
                    eval_simetria = "Asimetria significativa"
                    explicacion_simetria = "Diferencia pronunciada que requiere centrado individualizado para cada ojo."

            pdf.multi_cell(0, 6, self.texto_seguro(f"Evaluacion: {eval_simetria}"))
            pdf.multi_cell(0, 6, self.texto_seguro(f"Explicacion: {explicacion_simetria}"))

            # Implicaciones para gafas
            pdf.ln(2)
            pdf.set_font('Arial', 'B', 10)
            pdf.cell(0, 6, self.texto_seguro("Implicaciones para montura de gafas:"), 0, 1, 'L')
            pdf.set_font('Arial', '', 9)

            if usar_cm:
                if asimetria_valor < 0.2:
                    implicaciones = "Montura estandar con centrado simetrico."
                elif asimetria_valor < 0.4:
                    implicaciones = "Recomendado verificar centrado individual. Posible ajuste asimetrico del puente."
                else:
                    implicaciones = "Requiere montura con capacidad de ajuste asimetrico. Centrado individual para cada lente."
            else:
                if asimetria_valor < 5:
                    implicaciones = "Montura estandar con centrado simetrico."
                elif asimetria_valor < 10:
                    implicaciones = "Recomendado verificar centrado individual. Posible ajuste asimetrico del puente."
                else:
                    implicaciones = "Requiere montura con capacidad de ajuste asimetrico. Centrado individual para cada lente."

            pdf.multi_cell(0, 5, self.texto_seguro(implicaciones))
            pdf.ln(8)
        
        # Información técnica
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 8, self.texto_seguro('Procedimiento de Medicion Pupilar Real'), 0, 1, 'L')
        pdf.set_font('Arial', '', 10)
        pdf.multi_cell(0, 6, self.texto_seguro("Metodologia: Las distancias nasopupilares (DNP_I para ojo izquierdo, DNP_D para ojo derecho) y la distancia interpupilar (DIP) se miden en vision de lejos, verificando que DNP_I + DNP_D = DIP."))
        pdf.multi_cell(0, 6, self.texto_seguro("Posicionamiento: El optometrista se situa frente al paciente a 50 cm de distancia y a la misma altura, evitando errores de paralaje."))
        pdf.multi_cell(0, 6, self.texto_seguro("Proceso: El paciente fija la mirada en el ojo derecho del optometrista para medir DNP_I (ojo izquierdo), y luego en el ojo izquierdo para medir DNP_D (ojo derecho)."))
        pdf.multi_cell(0, 6, self.texto_seguro("Simultaneamente se marca la proyeccion pupilar en las plantillas para ubicar la altura visual (AV)."))
        pdf.ln(10)
        
        # --- PROPORCIONES FACIALES ---
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 12, self.texto_seguro('PROPORCIONES FACIALES CLAVE'), 0, 1, 'L')
        pdf.ln(5)
        
        def add_prop(titulo, clave, explicacion):
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 8, self.texto_seguro(titulo), 0, 1, 'L')
            pdf.set_font('Arial', '', 10)
            pdf.multi_cell(0, 6, self.texto_seguro(f"Valor: {medidas_px.get(clave, 0):.4f}"))
            pdf.multi_cell(0, 6, self.texto_seguro(explicacion))
            pdf.ln(3)
        
        add_prop('Proporcion Largo/Ancho del Rostro', 'R_AA', "Relacion entre el largo total (A) y el ancho de pomulos (B). Valores >1.7 indican rostros alargados, <1.5 indican rostros redondeados.")
        add_prop('Proporcion Largo/Ancho de Sienes', 'R_AE', "Relacion entre el largo total (A) y el ancho entre sienes (E). Ayuda a determinar la distribucion vertical de las facciones.")
        add_prop('Proporcion Pomulos/Frente', 'R_BC', "Relacion entre el ancho de pomulos (B) y el ancho de frente (C). Valores altos indican pomulos prominentes.")
        add_prop('Proporcion Pomulos/Mandibula', 'R_BD', "Relacion clave entre el ancho de pomulos (B) y mandibula (D). Valores cercanos a 1 indican estructura cuadrada, <0.9 indican estructura triangular.")
        add_prop('Proporcion Frente/Mandibula', 'R_CD', "Relacion entre el ancho de frente (C) y mandibula (D). Define la progresion de ancho desde la frente hacia la mandibula.")
        pdf.ln(10)
        
        # --- CARACTERISTICAS ESTRUCTURALES ---
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 12, self.texto_seguro('CARACTERISTICAS ESTRUCTURALES'), 0, 1, 'L')
        pdf.ln(5)
        
        add_prop('Angulo de Mandibula', 'angulo_mandibula', "Angulo promedio de la mandibula. Valores >135° indican mandibula suave, <125° indican mandibula angular y definida.")
        add_prop('Curvatura del Contorno Facial', 'curvatura', "Medida de la variacion del contorno facial. Valores altos indican contornos mas curvos, valores bajos indican contornos mas rectos.")
        pdf.ln(10)
        
        # ====================================================
        # SECCIÓN COMENTADA: RECOMENDACIONES OPTICAS PERSONALIZADAS
        # Se mantiene comentada según solicitud del usuario
        # ====================================================
        """
        # --- RECOMENDACIONES OPTICAS PERSONALIZADAS ---
        if recomendaciones:
            pdf.set_font('Arial', 'B', 18)
            pdf.cell(0, 15, self.texto_seguro('RECOMENDACIONES OPTICAS PERSONALIZADAS'), 0, 1, 'L')
            pdf.ln(8)

            for i, rec in enumerate(recomendaciones, 1):
                if pdf.get_y() > 200:
                    pdf.add_page()
                
                start_y = pdf.get_y()
                pdf.set_font('Arial', 'B', 14)
                pdf.cell(0, 10, self.texto_seguro(f"Opcion {i}: {rec.get('name', 'Sin nombre')}"), 0, 1, 'L')
                
                pdf.set_font('Arial', 'I', 11)
                pdf.cell(0, 8, self.texto_seguro(f"Estilo: {rec.get('style', 'No especificado')}"), 0, 1, 'L')
                
                image_path = rec.get('local_image')
                image_added = False
                if image_path and os.path.exists(image_path):
                    try:
                        pdf.image(image_path, x=140, y=start_y, w=60, h=45)
                        image_added = True
                    except Exception as e:
                        print(f"⚠️ No se pudo cargar imagen {image_path}: {e}")
                
                pdf.set_font('Arial', '', 10)
                razon_segura = self.texto_seguro(rec.get('reason', 'No disponible'))
                text_width = 120 if image_added else 0
                pdf.multi_cell(text_width, 6, self.texto_seguro(f"Razon: {razon_segura}"))
                pdf.ln(4)
                
                optical = rec.get("optical_fit", {})
                if optical:
                    pdf.set_font('Arial', 'B', 12)
                    pdf.cell(text_width, 8, self.texto_seguro("Detalles opticos recomendados:"), 0, 1, 'L')
                    pdf.set_font('Arial', '', 10)
                    pdf.multi_cell(text_width, 6, self.texto_seguro(f"- Codigo Boxing: {optical.get('calibre', '-')}"))
                    pdf.multi_cell(text_width, 6, self.texto_seguro("  - Primer numero: ancho del lente (calibre)"))
                    pdf.multi_cell(text_width, 6, self.texto_seguro("  - Segundo numero: ancho del puente"))
                    pdf.multi_cell(text_width, 6, self.texto_seguro("  - Tercer numero: largo de las varillas"))
                    pdf.ln(2)
                    pdf.multi_cell(text_width, 6, self.texto_seguro(f"- Angulo pantoscopico: {optical.get('angulo_pantoscopico', '-')}"))
                    pdf.multi_cell(text_width, 6, self.texto_seguro("  - Inclinacion del lente hacia adelante"))
                    pdf.ln(2)
                    pdf.multi_cell(text_width, 6, self.texto_seguro(f"- Curvatura base: {optical.get('curvatura_base', '-')}"))
                    pdf.multi_cell(text_width, 6, self.texto_seguro("  - Curvatura del lente"))
                    pdf.ln(2)
                    pdf.multi_cell(text_width, 6, self.texto_seguro(f"- Altura visual (AV): {optical.get('altura_visual_recomendada', '-')}"))
                    pdf.multi_cell(text_width, 6, self.texto_seguro("  - Distancia al centro optico"))
                    pdf.ln(2)
                
                pdf.ln(4)
                pdf.set_font('Arial', 'B', 10)
                pdf.cell(text_width, 8, self.texto_seguro(f"Compatibilidad: {rec.get('confidence', 0)}%"), 0, 1, 'L')
                pdf.set_draw_color(200, 200, 200)
                pdf.line(10, pdf.get_y(), 200, pdf.get_y())
                pdf.ln(10)
        """
        # ====================================================
        # FIN DE SECCIÓN COMENTADA
        # ====================================================

    def generar_pdf(self, analisis, output_path="analisis_facial.pdf"):
        """Generar PDF con el análisis completo"""
        try:
            print(f"📄 PDF: Iniciando generación de PDF: {output_path}")
            
            pdf = FPDF()
            # CONFIGURACIÓN PARA CARACTERES ESPECIALES
            pdf.set_auto_page_break(auto=True, margin=15)
            
            # Agregar soporte para caracteres extendidos
            pdf.add_page()
            
            # Usar una fuente que soporte más caracteres
            pdf.set_font('Arial', '', 12)
            
            # Portada - usar texto seguro
            pdf.set_font('Arial', 'B', 24)
            titulo_seguro = self.texto_seguro("ANALISIS FACIAL AVANZADO")
            pdf.cell(0, 20, titulo_seguro, 0, 1, 'C')
            pdf.ln(10)
            
            pdf.set_font('Arial', 'I', 12)
            fecha_segura = self.texto_seguro(f"Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
            pdf.cell(0, 10, fecha_segura, 0, 1, 'C')
            pdf.ln(10)
            
            # Resultado principal
            pdf.set_font('Arial', 'B', 16)
            pdf.cell(0, 12, self.texto_seguro('RESULTADO PRINCIPAL'), 0, 1, 'L')
            pdf.set_font('Arial', '', 12)
            forma = analisis.get('forma', 'No detectada')
            forma_seguro = self.texto_seguro(forma)
            descripcion_seguro = self.texto_seguro(analisis.get('descripcion', 'No disponible'))
            
            pdf.multi_cell(0, 8, self.texto_seguro(f"Forma facial detectada: {forma_seguro}"))
            pdf.multi_cell(0, 8, self.texto_seguro(f"Descripcion: {descripcion_seguro}"))
            pdf.ln(8)
            
            # Figura
            print("📊 PDF: Creando gráfico de análisis...")
            temp_figura = self.crear_grafico_analisis(analisis)
            
            if temp_figura and os.path.exists(temp_figura):
                file_size = os.path.getsize(temp_figura)
                print(f"✅ PDF: Figura encontrada ({file_size} bytes)")
                
                if file_size > 0:
                    # Calcular posición Y para centrar la imagen
                    current_y = pdf.get_y()
                    # Altura máxima disponible
                    available_height = 297 - current_y - 20  # A4 height = 297mm, margen inferior 20mm
                    image_height = 120  # Altura fija para la imagen
                    
                    if image_height < available_height:
                        pdf.image(temp_figura, x=10, y=current_y, w=190, h=image_height)
                        pdf.set_y(current_y + image_height + 10)  # Mover cursor después de la imagen
                        print("✅ PDF: Figura agregada al PDF")
                    else:
                        # Si no hay espacio, agregar nueva página
                        pdf.add_page()
                        pdf.image(temp_figura, x=10, y=20, w=190, h=120)
                        pdf.set_y(150)
                else:
                    pdf.multi_cell(0, 8, self.texto_seguro("Figura de analisis no disponible"))
                
                try:
                    os.remove(temp_figura)
                    print("🧹 PDF: Figura temporal limpiada")
                except Exception as e:
                    print(f"⚠️ PDF: Error limpiando figura: {e}")
            else:
                pdf.multi_cell(0, 8, self.texto_seguro("Figura de analisis no disponible"))
            
            # Página 2 - INFORME DETALLADO COMPLETO
            pdf.add_page()
            
            # Generar sección detallada de medidas CON recomendaciones
            self.generar_informe_detallado_medidas(
                pdf,
                analisis,  # Pasamos el análisis completo
                analisis.get('recomendaciones', [])
            )
            
            # Sección de tono de piel si está disponible
            if 'tono_piel' in analisis:
                self.generar_seccion_tono_piel(pdf, analisis['tono_piel'])
            
            # Página FINAL - MEDIDAS REALES (al final como solicitas)
            pdf.add_page()
            self.generar_seccion_medidas_reales(pdf, analisis)
            
            pdf.output(output_path)
            print(f"✅ PDF: Generado exitosamente: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"❌ PDF: Error generando PDF: {e}")
            print(f"🔍 PDF Traceback: {traceback.format_exc()}")
            return None

    def procesar_imagen_y_generar_pdf(self, analisis_result, output_pdf_path="analisis_facial.pdf"):
        """Proceso completo: generar PDF con el análisis"""
        try:
            print("🔄 PDF: Iniciando procesamiento...")
            pdf_path = self.generar_pdf(analisis_result, output_pdf_path)
            if pdf_path:
                print(f"✅ PDF: Proceso completado: {pdf_path}")
                return pdf_path
            else:
                print("❌ PDF: Error en el proceso")
                return None
        except Exception as e:
            print(f"❌ PDF: Error en procesamiento: {e}")
            return None