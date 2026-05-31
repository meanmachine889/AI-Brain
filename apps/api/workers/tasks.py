from workers.celery_app import celery_app


@celery_app.task(name="workers.tasks.hello")
def hello(name: str = "world"):
    print(f"[celery] hello, {name}!")
    return f"hello {name}"
