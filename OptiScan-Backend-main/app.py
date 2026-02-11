from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import json
import os
import base64
import tempfile

app = Flask(__name__)
CORS(app)

# Rutas a los scripts
venv_path = "./venv"
python_path = os.path.join(venv_path, "Scripts", "python")
main_script_path = os.path.join(os.path.dirname(__file__), "main.py")
tonos_script_path = os.path.join(os.path.dirname(__file__), "tonos.py")

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
            return jsonify({
                "success": False,
                "error": "No se proporcionó imagen",
                "message": "Imagen requerida para el análisis"
            }), 400

        # Obtener la imagen base64 del frontend
        image_base64 = data['image']

        # Guardar la imagen temporalmente
        try:
            image_bytes = base64.b64decode(image_base64.split(',')[-1])
            
            # Crear archivo temporal
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_path = temp_file.name
                temp_file.write(image_bytes)
            
            print(f">>> Imagen temporal guardada en: {temp_path}")
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Error al guardar la imagen: {str(e)}",
                "message": "No se pudo procesar la imagen enviada"
            }), 400

        # Ejecutar el script main.py con la ruta de la imagen como parámetro
        result = subprocess.run([
            python_path,
            main_script_path,
            temp_path  # Pasar la ruta de la imagen como parámetro
        ], capture_output=True, text=True, timeout=30, encoding='utf-8')

        # Limpiar archivo temporal
        if os.path.exists(temp_path):
            os.remove(temp_path)

        print(f">>> Resultado del script: {result.returncode}")

        if result.returncode == 0:
            # Buscar el JSON en la salida
            lines = result.stdout.strip().split('\n')
            json_line = None

            for line in reversed(lines):
                line = line.strip()
                if line.startswith('{') and line.endswith('}'):
                    try:
                        json.loads(line)
                        json_line = line
                        break
                    except Exception:
                        continue

            if not json_line:
                json_line = lines[-1] if lines else ""

            print(f">>> JSON encontrado: {json_line[:100]}...")

            try:
                analysis_result = json.loads(json_line)
                return jsonify({
                    "success": True,
                    "data": analysis_result,
                    "message": "Análisis completado exitosamente"
                })
            except json.JSONDecodeError as e:
                print(f">>> Error decodificando JSON: {e}")
                return jsonify({
                    "success": False,
                    "error": "Formato de respuesta inválido del script Python",
                    "stdout_preview": result.stdout[:200] + "..." if len(result.stdout) > 200 else result.stdout,
                    "stderr_preview": result.stderr[:200] + "..." if result.stderr and len(result.stderr) > 200 else result.stderr
                }), 500
        else:
            return jsonify({
                "success": False,
                "error": result.stderr,
                "stdout": result.stdout,
                "message": "Error en el análisis facial"
            }), 500

    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False,
            "error": "El análisis tardó demasiado tiempo",
            "message": "Timeout del análisis"
        }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Error interno del servidor"
        }), 500

@app.route('/analyze-skin-tone', methods=['POST'])
def analyze_skin_tone():
    """Endpoint para análisis de tono de piel"""
    try:
        data = request.get_json()

        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "error": "No se proporcionó imagen",
                "message": "Imagen requerida para el análisis"
            }), 400

        # Obtener la imagen base64 del frontend
        image_base64 = data['image']

        # Guardar la imagen temporalmente
        try:
            image_bytes = base64.b64decode(image_base64.split(',')[-1])
            
            # Crear archivo temporal
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_path = temp_file.name
                temp_file.write(image_bytes)
            
            print(f">>> Imagen temporal para tono guardada en: {temp_path}")
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Error al guardar la imagen: {str(e)}",
                "message": "No se pudo procesar la imagen enviada"
            }), 400

        # Ejecutar el script tonos.py
        result = subprocess.run([
            python_path,
            tonos_script_path,
            temp_path
        ], capture_output=True, text=True, timeout=30, encoding='utf-8')

        # Limpiar archivo temporal
        if os.path.exists(temp_path):
            os.remove(temp_path)

        print(f">>> Resultado del script tonos: {result.returncode}")

        if result.returncode == 0:
            # Buscar el JSON en la salida
            lines = result.stdout.strip().split('\n')
            json_line = None

            for line in reversed(lines):
                line = line.strip()
                if line.startswith('{') and line.endswith('}'):
                    try:
                        json.loads(line)
                        json_line = line
                        break
                    except Exception:
                        continue

            if not json_line:
                json_line = lines[-1] if lines else ""

            print(f">>> JSON tono encontrado: {json_line[:100]}...")

            try:
                analysis_result = json.loads(json_line)
                return jsonify({
                    "success": True,
                    "data": analysis_result,
                    "message": "Análisis de tono completado exitosamente"
                })
            except json.JSONDecodeError as e:
                print(f">>> Error decodificando JSON: {e}")
                return jsonify({
                    "success": False,
                    "error": "Formato de respuesta inválido del script Python",
                    "stdout_preview": result.stdout[:200] + "..." if len(result.stdout) > 200 else result.stdout,
                    "stderr_preview": result.stderr[:200] + "..." if result.stderr and len(result.stderr) > 200 else result.stderr
                }), 500
        else:
            return jsonify({
                "success": False,
                "error": result.stderr,
                "stdout": result.stdout,
                "message": "Error en el análisis de tono de piel"
            }), 500

    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False,
            "error": "El análisis tardó demasiado tiempo",
            "message": "Timeout del análisis"
        }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Error interno del servidor"
        }), 500

@app.route('/analyze-complete', methods=['POST'])
def analyze_complete():
    """Endpoint para análisis completo (forma + tono)"""
    try:
        data = request.get_json()

        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "error": "No se proporcionó imagen",
                "message": "Imagen requerida para el análisis"
            }), 400

        # Obtener la imagen base64 del frontend
        image_base64 = data['image']

        # Guardar la imagen temporalmente
        try:
            image_bytes = base64.b64decode(image_base64.split(',')[-1])
            
            # Crear archivo temporal
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_path = temp_file.name
                temp_file.write(image_bytes)
            
            print(f">>> Imagen temporal para análisis completo: {temp_path}")
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Error al guardar la imagen: {str(e)}",
                "message": "No se pudo procesar la imagen enviada"
            }), 400

        try:
            resultados = {}
            
            # 1. Análisis de forma de rostro
            print(">>> Ejecutando análisis de forma de rostro...")
            result_forma = subprocess.run([
                python_path,
                main_script_path,
                temp_path
            ], capture_output=True, text=True, timeout=30, encoding='utf-8')
            
            if result_forma.returncode == 0:
                for line in reversed(result_forma.stdout.strip().split('\n')):
                    line = line.strip()
                    if line.startswith('{') and line.endswith('}'):
                        try:
                            resultados['forma_rostro'] = json.loads(line)
                            break
                        except:
                            continue
            
            # 2. Análisis de tono de piel
            print(">>> Ejecutando análisis de tono de piel...")
            result_tono = subprocess.run([
                python_path,
                tonos_script_path,
                temp_path
            ], capture_output=True, text=True, timeout=30, encoding='utf-8')
            
            if result_tono.returncode == 0:
                for line in reversed(result_tono.stdout.strip().split('\n')):
                    line = line.strip()
                    if line.startswith('{') and line.endswith('}'):
                        try:
                            resultados['tono_piel'] = json.loads(line)
                            break
                        except:
                            continue
            
            # Limpiar archivo temporal
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            if resultados:
                return jsonify({
                    "success": True,
                    "data": resultados,
                    "message": "Análisis completados exitosamente"
                })
            else:
                return jsonify({
                    "success": False,
                    "error": "No se pudieron procesar los análisis",
                    "message": "Error en el procesamiento"
                }), 500

        except subprocess.TimeoutExpired:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return jsonify({
                "success": False,
                "error": "El análisis tardó demasiado tiempo",
                "message": "Timeout del análisis"
            }), 500

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Error interno del servidor"
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint para verificar el estado del servidor"""
    return jsonify({
        "status": "healthy", 
        "service": "OptiScan Backend",
        "python_path": python_path,
        "main_script_exists": os.path.exists(main_script_path),
        "tonos_script_exists": os.path.exists(tonos_script_path),
        "venv_exists": os.path.exists(venv_path)
    })

if __name__ == '__main__':
    print(">>> Iniciando servidor Flask para OptiScan...")
    print(f">>> Python path: {python_path}")
    print(f">>> Main script path: {main_script_path}")
    print(f">>> Tonos script path: {tonos_script_path}")
    print(f">>> Main script existe: {os.path.exists(main_script_path)}")
    print(f">>> Tonos script existe: {os.path.exists(tonos_script_path)}")
    print(f">>> Venv existe: {os.path.exists(venv_path)}")
    
    app.run(debug=True, port=5000, host='0.0.0.0')