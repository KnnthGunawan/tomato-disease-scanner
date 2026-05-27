CONFIDENCE_THRESHOLD = 0.60

DISCLAIMER = (
    "This tool is for screening only and does not replace expert agricultural advice."
)

CLASS_NAMES = [
    "Tomato___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
]

DISEASE_INFO = {
    "Tomato___healthy": {
        "label": "Healthy",
        "explanation": "The leaf appears consistent with a healthy tomato leaf in the screening model.",
        "next_steps": [
            "Continue routine plant monitoring.",
            "Water at soil level and keep foliage dry when possible.",
            "Inspect nearby plants for early signs of stress or disease.",
        ],
    },
    "Tomato___Bacterial_spot": {
        "label": "Bacterial Spot",
        "explanation": "Bacterial spot can cause small dark lesions on leaves and may spread in warm, wet conditions.",
        "next_steps": [
            "Remove heavily affected leaves and dispose of them away from the garden.",
            "Avoid overhead watering and improve air circulation.",
            "Clean tools after handling affected plants.",
            "Contact a local extension service for region-specific management advice.",
        ],
    },
    "Tomato___Early_blight": {
        "label": "Early Blight",
        "explanation": "Early blight often appears as brown spots with concentric rings, usually starting on older leaves.",
        "next_steps": [
            "Prune affected lower leaves and remove plant debris.",
            "Mulch around the plant to reduce soil splash.",
            "Improve spacing and airflow around plants.",
            "Seek local agricultural guidance before using any treatment product.",
        ],
    },
    "Tomato___Late_blight": {
        "label": "Late Blight",
        "explanation": "Late blight can spread quickly and may cause dark water-soaked leaf patches and stem lesions.",
        "next_steps": [
            "Isolate or remove severely affected plants promptly.",
            "Avoid composting infected plant material.",
            "Keep foliage dry and increase airflow.",
            "Ask a local extension expert to confirm the diagnosis quickly.",
        ],
    },
    "Tomato___Leaf_Mold": {
        "label": "Leaf Mold",
        "explanation": "Leaf mold is commonly associated with humid conditions and can create pale leaf patches with fuzzy growth underneath.",
        "next_steps": [
            "Reduce humidity around plants where possible.",
            "Increase ventilation and avoid wetting leaves.",
            "Remove affected leaves carefully.",
            "Use resistant varieties in future plantings when available.",
        ],
    },
    "Tomato___Septoria_leaf_spot": {
        "label": "Septoria Leaf Spot",
        "explanation": "Septoria leaf spot typically causes many small circular spots and can defoliate plants if unmanaged.",
        "next_steps": [
            "Remove spotted leaves and fallen debris.",
            "Water at the base of the plant.",
            "Stake or prune plants to improve airflow.",
            "Rotate crops away from tomatoes and related plants in future seasons.",
        ],
    },
    "Tomato___Spider_mites Two-spotted_spider_mite": {
        "label": "Spider Mites",
        "explanation": "Spider mite damage can look like stippling, yellowing, and fine webbing, especially in hot, dry conditions.",
        "next_steps": [
            "Check leaf undersides for mites or webbing.",
            "Rinse foliage gently with water to reduce mite pressure.",
            "Avoid stressing plants with inconsistent watering.",
            "Encourage beneficial insects and seek expert advice for severe infestations.",
        ],
    },
    "Tomato___Target_Spot": {
        "label": "Target Spot",
        "explanation": "Target spot can create brown lesions with lighter centers and may spread during warm, humid weather.",
        "next_steps": [
            "Remove affected foliage and plant debris.",
            "Improve airflow by pruning and spacing plants.",
            "Avoid overhead irrigation.",
            "Confirm with a local expert before starting any treatment program.",
        ],
    },
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
        "label": "Yellow Leaf Curl Virus",
        "explanation": "Yellow leaf curl virus is often associated with curled, yellowed leaves and stunted growth.",
        "next_steps": [
            "Inspect for whiteflies, which can spread the virus.",
            "Remove severely affected plants according to local guidance.",
            "Control weeds near tomato plants that may host pests.",
            "Use resistant varieties and insect exclusion methods in future plantings.",
        ],
    },
    "Tomato___Tomato_mosaic_virus": {
        "label": "Tomato Mosaic Virus",
        "explanation": "Tomato mosaic virus can cause mottled leaves, distortion, and reduced plant vigor.",
        "next_steps": [
            "Avoid handling healthy plants after touching suspected infected plants.",
            "Disinfect tools, supports, and hands after plant contact.",
            "Remove severely affected plants if advised by a local expert.",
            "Use certified disease-free seed and resistant varieties when possible.",
        ],
    },
}

UNCERTAIN_INFO = {
    "label": "Uncertain",
    "explanation": "The model confidence is below the screening threshold, so the image should not be treated as a reliable diagnosis.",
    "next_steps": [
        "Retake the photo in bright natural light with one leaf centered.",
        "Compare symptoms across several leaves and nearby plants.",
        "Ask a local agricultural extension service or plant pathologist for confirmation.",
    ],
}


def to_clean_label(raw_label: str) -> str:
    return DISEASE_INFO.get(raw_label, {"label": raw_label})["label"]


def get_disease_info(raw_label: str | None):
    if raw_label is None:
        return UNCERTAIN_INFO
    return DISEASE_INFO[raw_label]
