CREATE DATABASE IF NOT EXISTS struct_go;
USE struct_go;

CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('student','lecturer') NOT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `lecturers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `nip` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `faculty` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_lecturers_nip` (`nip`),
  KEY `fk_lecturers_user` (`user_id`),
  CONSTRAINT `fk_lecturers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `students` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `lecturer_id` bigint unsigned NOT NULL,
  `nim` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `prodi` varchar(100) DEFAULT NULL,
  `thesis_title` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_students_nim` (`nim`),
  KEY `fk_students_user` (`user_id`),
  KEY `fk_students_lecturer` (`lecturer_id`),
  CONSTRAINT `fk_students_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `consultation_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `audio_filename` varchar(255) DEFAULT NULL,
  `transcript_filename` varchar(255) DEFAULT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_consultation_logs_user` (`user_id`),
  CONSTRAINT `fk_consultation_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `feedback_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `log_id` bigint unsigned NOT NULL,
  `content` text NOT NULL,
  `category` enum('Minor','Major') NOT NULL,
  `status` enum('Fixed','Pending') NOT NULL DEFAULT 'Pending',
  `created_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_consultation_logs_feedback_items` (`log_id`),
  CONSTRAINT `fk_consultation_logs_feedback_items` FOREIGN KEY (`log_id`) REFERENCES `consultation_logs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--USERS
INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`, `updated_at`) VALUES
(1, 'dosen1@university.ac.id', 'hashed_pass_1', 'lecturer', NOW(), NOW()),
(2, 'mhs1@university.ac.id', 'hashed_pass_2', 'student', NOW(), NOW()),
(3, 'mhs2@university.ac.id', 'hashed_pass_3', 'student', '2026-03-06 15:50:05.092', '2026-03-06 15:50:05.092');

INSERT INTO `lecturers` (`id`, `user_id`, `nip`, `name`, `faculty`) VALUES
(1, 1, '198001012005011001', 'Dr. Arsitek Go, M.Kom', 'Informatika');

INSERT INTO `students` (`id`, `user_id`, `lecturer_id`, `nim`, `name`, `prodi`, `thesis_title`) VALUES
(1, 2, 1, '2200010001', 'Budi Mahasiswa', 'Teknik Informatika', 'Implementasi Microservices pada Sistem Log Bimbingan');

-- CONSULTATION LOGS
INSERT INTO `consultation_logs` (`id`, `user_id`, `audio_filename`, `transcript_filename`, `created_at`) VALUES
(1, 2, '1772789873064118400_One Direction - Night Changes.mp3', '1772789873064118400_transcript.txt', '2026-03-06 16:37:53.081');
