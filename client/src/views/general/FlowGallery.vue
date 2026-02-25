<template>
  <div class="gallery-page">
    <!-- Main Showcase Stage -->
    <transition name="stage-fade" mode="out-in">
      <section :key="activeFilm.id" class="film-stage">
        <div class="stage-bg-container">
          <video 
            autoplay 
            muted 
            loop 
            playsinline 
            class="stage-video"
            :poster="activeFilm.poster"
          >
            <source :src="activeFilm.video" type="video/mp4">
          </video>
          <div class="stage-overlay"></div>
        </div>
        
        <div class="stage-content container">
          <div class="film-info">
            <h1 class="film-title">{{ activeFilm.title }}</h1>
            <p class="film-synopsis">{{ activeFilm.synopsis }}</p>
            <div class="film-meta">
              <span class="creator">Created by {{ activeFilm.creator }}</span>
              <div class="social-icons">
                 <instagram theme="outline" size="18" fill="#fff" />
                 <share-two theme="outline" size="18" fill="#fff" />
              </div>
            </div>
            <button class="watch-btn">WATCH</button>
          </div>
        </div>
      </section>
    </transition>

    <!-- Bottom Carousel -->
    <footer class="carousel-footer">
      <div class="carousel-container">
        <button class="arrow prev" @click="prevFilm">
          <left theme="outline" size="24" fill="#fff" />
        </button>
        
        <div class="carousel-track">
          <div 
            v-for="(film, idx) in films" 
            :key="film.id" 
            class="thumb-item" 
            :class="{ active: film.id === activeFilm.id }"
            @click="activeFilmId = film.id"
          >
            <img :src="film.poster" :alt="film.title" />
            <div class="thumb-label">{{ film.title }}</div>
          </div>
        </div>

        <button class="arrow next" @click="nextFilm">
          <right theme="outline" size="24" fill="#fff" />
        </button>
      </div>
      <div class="disclaimer">
        Disclaimer: These films were created with AntStudio alongside other tools and techniques.
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Left, 
  Right, 
  Instagram, 
  ShareTwo
} from '@icon-park/vue-next'

// Import images
import filmElectricPink from '@/assets/images/film_electric_pink.jpg'
import filmDearStranger from '@/assets/images/film_dear_stranger.jpg'
import gallery3 from '@/assets/images/gallery_3.png'

const films = [
  {
    id: 'electric-pink',
    title: 'ELECTRIC PINK',
    synopsis: "You think you know coming-of-age? Think again. This one's got fights. And a multiverse. And, you know, a bit of crying. It's creativity: The Ride. Buckle-up, kid.",
    creator: 'Henry Daubrez',
    poster: filmElectricPink,
    video: 'https://storage.googleapis.com/gweb-tveo-website.appspot.com/short-films/ElectricPink-rollover.mp4'
  },
  {
    id: 'dear-stranger',
    title: 'DEAR "STRANGER"',
    synopsis: 'On the same day Eden was born, her grandmother passed away. But when a train crashes into a parallel world, time breaks open, and memories flood the stage.',
    creator: 'Junie Lau',
    poster: filmDearStranger,
    video: 'https://storage.googleapis.com/gweb-tveo-website.appspot.com/short-films/DearStranger-rollover.mp4'
  },
  {
    id: 'freelancers',
    title: 'FREELANCERS',
    synopsis: 'Over dinner in a clandestine New York restaurant, two estranged adopted brothers—one methodical, the other loud and brash—reminisce on their careers as international hitmen.',
    creator: 'Dave Clark',
    poster: gallery3,
    video: 'https://storage.googleapis.com/gweb-tveo-website.appspot.com/short-films/Freelancers-rollover.mp4'
  }
]

const activeFilmId = ref('electric-pink')
const activeFilm = computed(() => films.find(f => f.id === activeFilmId.value) || films[0])

const nextFilm = () => {
  const currentIndex = films.findIndex(f => f.id === activeFilmId.value)
  const nextIndex = (currentIndex + 1) % films.length
  activeFilmId.value = films[nextIndex].id
}

const prevFilm = () => {
  const currentIndex = films.findIndex(f => f.id === activeFilmId.value)
  const prevIndex = (currentIndex - 1 + films.length) % films.length
  activeFilmId.value = films[prevIndex].id
}
</script>

<style lang="scss" scoped>
.gallery-page {
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: #000;
}

/* Stage */
.film-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 1;
}

.stage-bg-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.stage-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.5);
}

.stage-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.8) 100%);
}

.stage-content {
  position: relative;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 80px;
  z-index: 5;
}

.film-info {
  max-width: 700px;
}

.film-title {
  font-size: 64px;
  font-weight: 800;
  margin: 0 0 24px;
  line-height: 1;
  color: #fff;
}

.film-synopsis {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin-bottom: 32px;
}

.film-meta {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
}

.creator {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
}

.social-icons {
  display: flex;
  gap: 16px;
}

.watch-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  padding: 12px 40px;
  border-radius: 100px;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: #fff;
    color: #000;
  }
}

/* Footer Carousel */
.carousel-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32px 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  text-align: center;
  z-index: 100;
}

.carousel-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  margin-bottom: 24px;
}

.carousel-track {
  display: flex;
  gap: 20px;
}

.thumb-item {
  width: 180px;
  cursor: pointer;
  opacity: 0.4;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    opacity: 0.7;
  }

  &.active {
    opacity: 1;
    transform: scale(1.1);
  }

  img {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    border-radius: 8px;
    margin-bottom: 8px;
    border: 1px solid transparent;
  }

  &.active img {
    border-color: #fff;
  }
}

.thumb-label {
  font-size: 10px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.4);
  display: none;
}

.thumb-item.active .thumb-label {
  display: block;
}

.arrow {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.3s;

  &:hover {
    opacity: 1;
  }
}

.disclaimer {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

/* Transitions */
.stage-fade-enter-active, .stage-fade-leave-active {
  transition: opacity 0.5s ease;
}
.stage-fade-enter-from, .stage-fade-leave-to {
  opacity: 0;
}
</style>
