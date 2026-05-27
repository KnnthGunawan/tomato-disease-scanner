from config import CLASS_NAMES, DATA_DIR


def main():
    for split in ["train", "val", "test"]:
        for class_name in CLASS_NAMES:
            (DATA_DIR / split / class_name).mkdir(parents=True, exist_ok=True)

    print(f"Created dataset folders under {DATA_DIR}")
    print("Copy PlantVillage tomato images into each class folder before training.")


if __name__ == "__main__":
    main()
