from worker import process_topic


if __name__ == "__main__":
    topic = input("Enter your question: ")
    model = input("Model [deepseek/deepseek-v3.2]: ").strip() or "deepseek/deepseek-v3.2"
    engine = input("Engine [auto|manim|remotion]: ").strip() or "auto"
    result = process_topic(topic, model=model, engine=engine)
    print(result or "Failed")
