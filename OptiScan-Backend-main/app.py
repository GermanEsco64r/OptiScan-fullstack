# ==================== IMPORTS ====================
import os
import base64
import tempfile
import json
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Forzar backend no interactivo
import matplotlib.pyplot as plt
import traceback

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# Tus módulos personalizados
from mm import analizar_imagen_con_medidas_reales, PDFReportGeneratorExtendido
from main_pdf import AnalizadorFormaRostroPDF
from pdf import PDFReportGenerator

# IMPORTACIONES DIRECTAS (sin subprocess)
from main import analizar_imagen_archivo  # Función que retorna el análisis facial
from tonos import analizar_tono_imagen     # Función que retorna el análisis de tono

# ==================== CONFIGURACIÓN ====================
app = Flask(__name__)
CORS(app)  # En producción puedes limitar orígenes

# Inicializaciones para PDF
analizador = AnalizadorFormaRostroPDF()
pdf_generator = PDFReportGenerator(analizador)

# ==================== FUNCIONES AUXILIARES (desde appdf.py) ====================
def crear_figura_directamente(analisis):
    """Crear la figura de matplotlib directamente para debug"""
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
        
        # Dibujar rectángulo del rostro si está disponible
        if 'rect_rostro' in analisis:
            x, y, w, h = analisis['rect_rostro']
            cv2.rectangle(imagen, (x, y), (x+w, y+h), (0, 255, 0), 2)
        else:
            # Calcular rectángulo aproximado si no está disponible
            print("⚠️ No hay rect_rostro, calculando uno aproximado...")
            todos_puntos = list(puntos.values())
            xs = [p[0] for p in todos_puntos]
            ys = [p[1] for p in todos_puntos]
            x, y = min(xs), min(ys)
            w, h = max(xs) - x, max(ys) - y
            cv2.rectangle(imagen, (x, y), (x+w, y+h), (0, 255, 0), 2)
        
        # Dibujar contorno facial si tenemos puntos
        if 'puntos_faciales' in analisis and analisis['puntos_faciales'] is not None:
            puntos_array = np.array(analisis['puntos_faciales'])
            contorno = analizador.calcular_contorno_rostro(puntos_array)
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
            # Poner el texto en una posición fija si no hay rect_rostro
            cv2.putText(imagen, f"FORMA: {forma}", (50, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        
        # Crear la figura de matplotlib
        plt.figure(figsize=(14, 10))
        plt.imshow(cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB))
        plt.title(f"ANÁLISIS DE FORMA FACIAL - {forma}", fontsize=16, weight='bold')
        plt.axis('off')
        
        # Guardar la figura en un archivo temporal
        temp_path = "temp_direct_figure.png"
        plt.tight_layout()
        plt.savefig(temp_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()  # Cerrar la figura para liberar memoria
        
        print(f"✅ Figura directa guardada en: {temp_path}")
        return temp_path
        
    except Exception as e:
        print(f"❌ Error creando figura directa: {e}")
        print(f"🔍 Traceback: {traceback.format_exc()}")
        return None

# ==================== ENDPOINTS DE ANÁLISIS (con imports directos) ====================

@app.route('/check-camera', methods=['GET'])
def check_camera():
    """Endpoint para verificar que el backend funciona"""
    return jsonify({"status": "Backend Flask conectado correctamente"})

@app.route('/analyze-face', methods=['POST'])
def analyze_face():
    """Endpoint para ejecutar el análisis facial con imagen capturada"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"success": False, "error": "No se proporcionó imagen"}), 400

        image_base64 = data['image']

        # Guardar la imagen temporalmente
        try:
            image_bytes = base64.b64decode(image_base64.split(',')[-1])
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_path = temp_file.name
                temp_file.write(image_bytes)
            print(f">>> Imagen temporal guardada en: {temp_path}")
        except Exception as e:
            return jsonify({"success": False, "error": f"Error al guardar imagen: {str(e)}"}), 400

        # Llamada directa a la función de main
        analysis_result = analizar_imagen_archivo(temp_path)

        # Limpiar archivo temporal
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if analysis_result and analysis_result.get('estado') == 'exitoso':
            return jsonify({"success": True, "data": analysis_result})
        else:
            return jsonify({"success": False, "error": analysis_result.get('error', 'Error en análisis')}), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/analyze-skin-tone', methods=['POST'])
def analyze_skin_tone():
    """Endpoint para análisis de tono de piel"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"success": False, "error": "No se proporcionó imagen"}), 400

        image_base64 = data['image']

        # Guardar la imagen temporalmente
        try:
            image_bytes = base64.b64decode(image_base64.split(',')[-1])
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_path = temp_file.name
                temp_file.write(image_bytes)
            print(f">>> Imagen temporal para tono guardada en: {temp_path}")
        except Exception as e:
            return jsonify({"success": False, "error": f"Error al guardar imagen: {str(e)}"}), 400

        # Llamada directa a la función de tonos
        analysis_result = analizar_tono_imagen(temp_path)

        # Limpiar archivo temporal
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if analysis_result and analysis_result.get('estado') == 'exitoso':
            return jsonify({"success": True, "data": analysis_result})
        else:
            return jsonify({"success": False, "error": analysis_result.get('error', 'Error en análisis')}), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/analyze-complete', methods=['POST'])
def analyze_complete():
    """Endpoint para análisis completo (forma + tono) con medidas reales"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"success": False, "error": "No se proporcionó imagen"}), 400

        image_base64 = data['image']

        # Guardar la imagen temporalmente
        try:
            image_bytes = base64.b64decode(image_base64.split(',')[-1])
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_path = temp_file.name
                temp_file.write(image_bytes)
            print(f">>> Imagen temporal para análisis completo: {temp_path}")
        except Exception as e:
            return jsonify({"success": False, "error": f"Error al guardar imagen: {str(e)}"}), 400

        resultados = {}

        # Análisis de forma (directo)
        forma_data = analizar_imagen_archivo(temp_path)
        if forma_data and forma_data.get('estado') == 'exitoso':
            forma_data = analizar_imagen_con_medidas_reales(image_base64, forma_data)
            resultados['forma_rostro'] = forma_data

        # Análisis de tono (directo)
        tono_data = analizar_tono_imagen(temp_path)
        if tono_data and tono_data.get('estado') == 'exitoso':
            resultados['tono_piel'] = tono_data

        # Limpiar archivo temporal
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if resultados:
            return jsonify({"success": True, "data": resultados})
        else:
            return jsonify({"success": False, "error": "No se pudieron procesar los análisis"}), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint para verificar el estado del servidor (versión combinada)"""
    return jsonify({
        "status": "healthy",
        "service": "OptiScan Backend Unificado (sin subprocess)",
        "pdf_generator_initialized": pdf_generator is not None
    })


# ==================== ENDPOINTS DE PDF (desde appdf.py) ====================
@app.route('/generate-pdf-report', methods=['POST', 'OPTIONS'])
def generate_pdf_report():
    """Endpoint para generar PDF del análisis facial"""
    if request.method == 'OPTIONS':
        return '', 200

    try:
        print("📨 Recibiendo solicitud para generar PDF...")
        data = request.get_json()
        
        if not data or 'image' not in data:
            print("❌ No se proporcionó imagen en la solicitud")
            return jsonify({'success': False, 'error': 'No image data provided'}), 400
        
        base64_image = data['image']
        print(f"📷 Imagen recibida (longitud base64: {len(base64_image)})")
        
        # Crear archivo temporal PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_pdf_path = temp_file.name
        
        # Guardar imagen temporal
        temp_img_path = "temp_pdf_analysis.jpg"
        try:
            if ',' in base64_image:
                base64_image_clean = base64_image.split(',')[1]
            else:
                base64_image_clean = base64_image
                
            image_bytes = base64.b64decode(base64_image_clean)
            with open(temp_img_path, 'wb') as f:
                f.write(image_bytes)
        except Exception as e:
            return jsonify({'success': False, 'error': f'Error procesando imagen: {str(e)}'}), 400
        
        # Analizar forma de rostro (con el analizador específico para PDF)
        analisis_result = analizador.analizar_rostro(temp_img_path)
        
        # --- INTEGRAR MEDIDAS REALES ---
        if analisis_result and analisis_result.get('estado') == 'exitoso':
            print("🔄 Integrando medidas reales...")
            analisis_result = analizar_imagen_con_medidas_reales(base64_image, analisis_result)
            
            if 'medidas_convertidas' in analisis_result:
                print("✅ Medidas reales integradas exitosamente")
            else:
                print("⚠️ No se pudieron integrar medidas reales")
        
        # Analizar tono de piel (llamada directa)
        tono_result = analizar_tono_imagen(temp_img_path)
        
        # Combinar resultados si el análisis de tono fue exitoso
        if tono_result and tono_result.get('estado') == 'exitoso':
            analisis_result['tono_piel'] = tono_result
            print("✅ Análisis de tono de piel agregado al reporte")
        
        # Limpiar imagen temporal
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
        
        if not analisis_result or analisis_result.get('estado') == 'error':
            return jsonify({'success': False, 'error': 'Error en análisis facial'}), 400

        print("📄 Generando PDF completo con PDFReportGenerator...")
        pdf_path = pdf_generator.generar_pdf(analisis_result, temp_pdf_path)
        
        if pdf_path and os.path.exists(pdf_path):
            # Verificar tamaño del PDF
            file_size = os.path.getsize(pdf_path)
            print(f"✅ PDF generado: {pdf_path} ({file_size} bytes)")
            
            if file_size == 0:
                print("❌ PDF generado está vacío")
                return jsonify({'success': False, 'error': 'PDF vacío generado'}), 500
            
            response = send_file(
                pdf_path,
                as_attachment=True,
                download_name='analisis_facial_optiscan.pdf', 
                mimetype='application/pdf'
            )
            
            @response.call_on_close
            def cleanup():
                try:
                    if os.path.exists(pdf_path):
                        os.remove(pdf_path)
                        print("🧹 PDF temporal limpiado")
                except Exception as e:
                    print(f"⚠️ Error limpiando archivo temporal: {e}")
            
            return response
        else:
            print("❌ No se pudo generar el PDF")
            return jsonify({'success': False, 'error': 'Error generando PDF report'}), 500
            
    except Exception as e:
        print(f"💥 Error crítico en generate-pdf-report: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'Error interno: {str(e)}'}), 500


@app.route('/debug-figure', methods=['POST', 'OPTIONS'])
def debug_figure():
    """Endpoint solo para debug de la figura"""
    if request.method == 'OPTIONS':
        return '', 200

    try:
        print("🐛 DEBUG: Probando creación de figura...")
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No image'}), 400
        
        base64_image = data['image']
        
        temp_img_path = "temp_debug.jpg"
        if ',' in base64_image:
            base64_image_clean = base64_image.split(',')[1]
        else:
            base64_image_clean = base64_image
                
        with open(temp_img_path, 'wb') as f:
            f.write(base64.b64decode(base64_image_clean))
        
        analisis_result = analizador.analizar_rostro(temp_img_path)
        os.remove(temp_img_path)
        
        if not analisis_result:
            return jsonify({'success': False, 'error': 'No se pudo analizar'}), 400
        
        figura_path = crear_figura_directamente(analisis_result)
        if figura_path and os.path.exists(figura_path):
            with open(figura_path, "rb") as f:
                figura_base64 = base64.b64encode(f.read()).decode('utf-8')
            os.remove(figura_path)
            return jsonify({'success': True, 'figura': f"data:image/png;base64,{figura_base64}", 'forma': analisis_result.get('forma')})
        else:
            return jsonify({'success': False, 'error': 'No se pudo crear figura'}), 500
            
    except Exception as e:
        print(f"💥 Error en debug: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/health-pdf', methods=['GET'])
def health_pdf():
    """Endpoint para verificar el estado del generador PDF"""
    return jsonify({
        "status": "healthy", 
        "service": "OptiScan PDF Generator",
        "pdf_generator": "active"
    })


# ==================== EJECUCIÓN PRINCIPAL ====================
if __name__ == '__main__':
    print(">>> Iniciando servidor Flask unificado para OptiScan (sin subprocess)...")
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    app.run(host='0.0.0.0', port=port, debug=debug_mode)