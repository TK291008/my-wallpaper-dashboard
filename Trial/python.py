import pygame
import math
import random

# Pygame-ni ishga tushirish
pygame.init()
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Heart Particle Animation")
clock = pygame.time.Clock()

# Ranglar
BLACK = (0, 0, 0)

# Zarracha (Particle) klassi
class Particle:
    def __init__(self):
        # Yurak matematik formulasi (Heart Curve)
        self.t = random.uniform(0, 2 * math.pi)

        # Asosiy yurak shakli koordinatalari
        # t kattalashgani sayin yurak shakli chiziladi
        x = 16 * math.sin(self.t) ** 3
        y = 13 * math.cos(self.t) - 5 * math.cos(2 * self.t) - 2 * math.cos(3 * self.t) - math.cos(4 * self.t)

        # Sahnadagi markaziy o'rni va tasodifiy tarqoqlik (Rasmda bo'lgani kabi)
        self.base_x = WIDTH // 2 + int(x * 15)
        self.base_y = HEIGHT // 2 - int(y * 15)

        self.reset()

    def reset(self):
        # Tasodifiy sochilish effektini berish
        self.x = self.base_x + random.randint(-20, 20)
        self.y = self.base_y + random.randint(-20, 20)
        self.size = random.randint(2, 5)
        # Pushti rang tuslari
        self.color = (random.randint(200, 255), random.randint(50, 100), random.randint(120, 180))
        self.alpha = random.randint(100, 255)
        self.speed = random.uniform(0.5, 2)

    def update(self):
        # Pulsatsiya (yurak urishi) effekti uchun zarrachalarni biroz qimirlatish
        self.x += random.uniform(-0.5, 0.5) * self.speed
        self.y += random.uniform(-0.5, 0.5) * self.speed

    def draw(self, surface):
        pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), self.size)

# 1000 ta zarracha yaratish
particles = [Particle() for _ in range(1000)]

# Asosiy sikl
running = True
while running:
    screen.fill(BLACK)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # Zarrachalarni yangilash va chizish
    for p in particles:
        p.update()
        p.draw(screen)

    pygame.display.flip()
    clock.tick(60)  # FPS tezligi

pygame.quit()