import numpy as np
import sys
import cv2
import time
import json

# 回傳data設定
data = {'abnormal':False}

path = ""
image_nm = path + "public/img/upload/" + sys.argv[1]
num = sys.argv[2]

image = cv2.imread(image_nm)
Width, Height = image.shape[1], image.shape[0]

w_new, h_new = 800, 600

if Width / Height >= w_new / h_new:
    image = cv2.resize(image, (w_new, int(Height * w_new / Width)))
else:
    image = cv2.resize(image, (int(Width * h_new / Height), h_new))

data['Width'] = image.shape[1]
data['Height'] = image.shape[0]
clone = image.copy()
scale = 0.00392


weightsPath =  path + "model/yolov3_12000.weights"
configPath = path + "model/yolov3.cfg"

# load our YOLO object detector trained on COCO dataset (4 classes)
net = cv2.dnn.readNetFromDarknet(configPath, weightsPath)

labelsPath = path + "model/obj.names"
LABELS = open(labelsPath).read().strip().split("\n")
 
# initialize a list of colors to represent each possible class label
np.random.seed(42)
COLORS = np.random.randint(0, 255, size=(len(LABELS), 3), dtype="uint8")

(H, W) = image.shape[:2]

# determine only the *output* layer names that we need from YOLO

ln = net.getLayerNames()
# print(net.getUnconnectedOutLayers().shape)
ln = [ln[i[0] - 1] for i in net.getUnconnectedOutLayers()]
# construct a blob from the input image and then perform a forward
# pass of the YOLO object detector, giving us our bounding boxes and
# associated probabilities
blob = cv2.dnn.blobFromImage(image, 1 / 255.0, (416, 416), swapRB=True, crop=False)
net.setInput(blob)
start = time.time()
layerOutputs = net.forward(ln)
end = time.time()
 
# show timing information on YOLO
data['laoding_time'] = "{:.6f}".format(end - start)

boxes = []
confidences = []
classIDs = []

for output in layerOutputs:
    # loop over each of the detections
    for detection in output:
    # extract the class ID and confidence (i.e., probability) of
        # the current object detection
        scores = detection[5:]
        classID = np.argmax(scores)
        confidence = scores[classID]
        # filter out weak predictions by ensuring the detected
        # probability is greater than the minimum probability
        if confidence > 0.24:
            # scale the bounding box coordinates back relative to the
            # size of the image, keeping in mind that YOLO actually
            # returns the center (x, y)-coordinates of the bounding
            # box followed by the boxes' width and height
            box = detection[0:4] * np.array([W, H, W, H])
            
            (centerX, centerY, width, height) = box.astype("int")
 
            # use the center (x, y)-coordinates to derive the top and
            # and left corner of the bounding box
            x = int(centerX - (width / 2))
            y = int(centerY - (height / 2))
 
            # update our list of bounding box coordinates, confidences,
            # and class IDs
            boxes.append([x, y, int(width), int(height)])
            confidences.append(float(confidence))
            classIDs.append(classID)

idxs = cv2.dnn.NMSBoxes(boxes, confidences, 0.24, 0.4)
# ensure at least one detection exists

if len(idxs) > 0:
    # loop over the indexes we are keeping
	data['abnormal'] = True
	data['cropped'] = []
	key = 1
	for i in idxs.flatten():
        # extract the bounding box coordinates
		(x, y) = (boxes[i][0], boxes[i][1])
		(w, h) = (boxes[i][2], boxes[i][3])
		
		# draw a bounding box rectangle and label on the image
		color = [int(c) for c in COLORS[classIDs[i]]]
		cv2.rectangle(image, (x, y), (x + w, y + h), color, 2)
		text = "{}: {:.4f}".format(LABELS[classIDs[i]], confidences[i])
		cv2.putText(image, text, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX,0.5, color, 2)
		
		# show the output cropped image
		fin_x = 0
		fin_y = 0
		if x > 0: fin_x = x
		if y > 0: fin_y = y
		fin_xw = x+w
		fin_yh = y+h

		crop_img = clone[fin_y : fin_yh, fin_x: fin_xw]
		inner_data = {}
		#inner_data['num'] = str(key)
		inner_data['label'] = LABELS[classIDs[i]]
		inner_data['confidences'] = confidences[i]
		inner_data['position'] = f"[{fin_y} : {fin_yh}, {fin_x}: {fin_xw}]"
		data['cropped'].append(inner_data)
		key += 1

outputpath = 'img/after/{}'.format(num)
result = cv2.imwrite(path + 'public/' + outputpath, image)
if result==True:
	data['outputpath'] = outputpath
	json = json.dumps(data)
	print(str(json))