# OptiScan - Sistema de Análisis Facial Inteligente

## Descripción

OptiScan es un sistema de análisis facial que utiliza visión por computadora y machine learning para analizar la forma del rostro y el tono de piel, proporcionando recomendaciones personalizadas de gafas y lentes. El sistema genera informes detallados en PDF con los resultados del análisis.

## Instalación

### Prerrequisitos
- Python 3.8 o superior (se recomienda 3.9)
- pip (gestor de paquetes de Python)
- Entorno virtual (recomendado)

### Pasos de Instalación

1. **Crear un entorno virtual**
   ```bash
   # Para Windows
   python -m venv venv
   
   # Para Linux/Mac
   python3 -m venv venv
   ```

2. **Activar el entorno virtual**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Instalar dependencias**
   
   Crea un archivo `requirements.txt` con el siguiente contenido:
   ```
   flask==2.3.3
   flask-cors==4.0.0
   opencv-python==4.8.1.78
   mediapipe==0.10.9
   scikit-learn==1.3.0
   numpy==1.24.3
   matplotlib==3.7.2
   fpdf==1.7.2
   ```
   
   Luego instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

   **Nota sobre MediaPipe**: En Windows, MediaPipe funciona mejor con Python 3.9. Si usas Python 3.11+, puede que necesites instalar una versión específica:
   ```bash
   pip install mediapipe --no-deps
   pip install opencv-python numpy protobuf
   ```

## Despliegue y Ejecución

El sistema está compuesto por dos servidores Flask que deben ejecutarse simultáneamente:

### Servidor Principal (app.py)
Este servidor maneja el análisis facial y de tono de piel.

**Comando de ejecución:**
```bash
python app.py
```
- **Puerto por defecto**: 5000
- **URL de acceso**: http://localhost:5000

### Servidor de PDF (appdf.py)
Este servidor genera los reportes en PDF.

**Comando de ejecución:**
```bash
python appdf.py
```
- **Puerto por defecto**: 5001
- **URL de acceso**: http://localhost:5001

### Ejecución en Desarrollo
1. Abre dos terminales o ventanas de línea de comandos
2. En la primera terminal, activa el entorno virtual y ejecuta:
   ```bash
   python app.py
   ```
3. En la segunda terminal, activa el entorno virtual y ejecuta:
   ```bash
   python appdf.py
   ```

### Ejecución en Producción

Para producción, se recomienda usar un servidor WSGI como Waitress o Gunicorn:

**Usando Waitress (Windows/Linux/Mac):**
```bash
# Instalar Waitress
pip install waitress

# Ejecutar servidor principal
waitress-serve --port=5000 --threads=4 app:app

# Ejecutar servidor de PDF (en otra terminal)
waitress-serve --port=5001 --threads=2 appdf:app
```

**Usando Gunicorn (Linux/Mac):**
```bash
# Instalar Gunicorn
pip install gunicorn

# Ejecutar servidor principal
gunicorn --bind 0.0.0.0:5000 --workers 4 app:app

# Ejecutar servidor de PDF
gunicorn --bind 0.0.0.0:5001 --workers 2 appdf:app
```

### Configuración con Nginx (Recomendado para producción)
Configura Nginx como proxy inverso para ambos servidores:

```nginx
# Servidor Principal (app.py)
server {
    listen 80;
    server_name api.tudominio.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Servidor de PDF (appdf.py)
server {
    listen 80;
    server_name pdf.tudominio.com;
    
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Endpoints Disponibles

### Servidor Principal (puerto 5000)

#### `GET /check-camera`
Verifica que el servidor esté funcionando.

#### `POST /analyze-face`
Analiza la forma del rostro. 
- **Body**: `{ "image": "data:image/jpeg;base64,..." }`
- **Response**: JSON con análisis de forma facial

#### `POST /analyze-skin-tone`
Analiza el tono de piel.
- **Body**: `{ "image": "data:image/jpeg;base64,..." }`
- **Response**: JSON con análisis de tono de piel

#### `POST /analyze-complete`
Análisis completo (forma + tono).
- **Body**: `{ "image": "data:image/jpeg;base64,..." }`
- **Response**: JSON combinado con ambos análisis

#### `GET /health`
Verifica el estado del servidor y dependencias.

### Servidor de PDF (puerto 5001)

#### `POST /generate-pdf-report`
Genera un PDF con el análisis completo.
- **Body**: `{ "image": "data:image/jpeg;base64,..." }`
- **Response**: Archivo PDF descargable

#### `GET /health-pdf`
Verifica el estado del generador de PDF.

## Cómo Usar el Sistema

### 1. Preparación de la Imagen
- Captura una imagen frontal del rostro
- Buena iluminación, sin sombras
- Rostro centrado y visible
- Formato JPEG o PNG

### 2. Análisis Básico
```bash
# Convertir imagen a base64
# En frontend usar: const base64Image = canvas.toDataURL('image/jpeg');

# Enviar al servidor
curl -X POST http://localhost:5000/analyze-face \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,..."}'
```

### 3. Generar PDF
```bash
# Enviar imagen para generar PDF
curl -X POST http://localhost:5001/generate-pdf-report \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,..."}' \
  --output analisis.pdf
```

## Solución de Problemas

### Error: "ModuleNotFoundError: No module named 'mediapipe'"
```bash
# Verificar versión de Python
python --version

# Si es Python 3.11+, instalar versión específica
pip install mediapipe==0.10.9 --no-deps
pip install opencv-python numpy protobuf
```

### Error: "No se detectaron rostros"
- Asegurar buena iluminación
- Rostro debe estar de frente
- Evitar gafas de sol o accesorios que cubran el rostro
- Usar resolución mínima de 640x480 píxeles

### Error: "Puerto ya en uso"
```bash
# Cambiar puertos en los archivos:
# En app.py: app.run(port=5002, ...)
# En appdf.py: app.run(port=5003, ...)
```

### Error de memoria
- Reducir tamaño de imagen (máximo 2MB recomendado)
- Cerrar otras aplicaciones que consuman recursos gráficos

## Mantenimiento

### Actualizar Dependencias
```bash
# Actualizar todas las dependencias
pip install --upgrade -r requirements.txt

# Generar nuevo requirements.txt
pip freeze > requirements.txt
```

### Limpieza de Archivos Temporales
Los servidores generan archivos temporales que se eliminan automáticamente. Para limpieza manual:

```bash
# Eliminar archivos temporales (Windows)
del temp_*.jpg temp_*.pdf temp_*.png

# Eliminar archivos temporales (Linux/Mac)
rm -f temp_*.jpg temp_*.pdf temp_*.png
```

### Monitoreo
```bash
# Verificar logs (Linux/Mac)
tail -f nohup.out

# Verificar logs (Windows PowerShell)
Get-Content app.log -Wait

# Monitorear uso de CPU/Memoria
# Windows: Task Manager
# Linux: htop o top
```

## Notas Importantes

1. **Rendimiento**: El análisis de imágenes puede consumir recursos de CPU. En producción, considerar balanceadores de carga.
2. **Imágenes**: El sistema funciona mejor con imágenes de al menos 640x480 píxeles.
3. **Seguridad**: En producción, implementar límites de tasa (rate limiting) y validación de imágenes.
4. **Backup**: Mantener copias de seguridad del código y archivos de configuración.
5. **Actualizaciones**: Mantener Python y las dependencias actualizadas para seguridad y rendimiento.

## Estructura de Archivos
```
OptiScan/
├── app.py              # Servidor principal
├── appdf.py            # Servidor de PDF
├── main.py             # Script de análisis facial
├── main_pdf.py         # Analizador para PDF
├── pdf.py              # Generador de PDF
├── tonos.py            # Analizador de tono de piel
├── requirements.txt    # Dependencias
└── venv/               # Entorno virtual
```

Para cualquier problema o pregunta, revisa la sección de Solución de Problemas o consulta la documentación de cada biblioteca utilizada.

